import { useEffect, useState } from "react";
import { collection, limitToLast, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { db, ensureSignedIn, ROOM_ID } from "./firebase";
import { friendlyError } from "./api";
import type { Message } from "./types";

/** Live feed of rooms/demo/messages, oldest first. */
export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsub = () => {};
    let cancelled = false;
    ensureSignedIn()
      .then(() => {
        if (cancelled) return;
        const q = query(collection(db, "rooms", ROOM_ID, "messages"), orderBy("createdAt", "asc"), limitToLast(100));
        unsub = onSnapshot(
          q,
          (snap) => {
            setMessages(
              snap.docs.map((d) => {
                const m = d.data();
                return {
                  id: d.id,
                  ...m,
                  createdAt: m.createdAt instanceof Timestamp ? m.createdAt.toDate() : null,
                } as Message;
              })
            );
            setLoading(false);
            setError(null);
          },
          (err) => {
            setError(err.message);
            setLoading(false);
          }
        );
      })
      .catch((e) => {
        setError(friendlyError(e));
        setLoading(false);
      });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return { messages, loading, error };
}
