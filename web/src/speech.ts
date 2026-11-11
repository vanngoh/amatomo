import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "./types";

// ---------- Speech recognition ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognition = any;

function getRecognitionCtor(): AnyRecognition | null {
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as AnyRecognition;
}

export const recognitionSupported = typeof window !== "undefined" && !!getRecognitionCtor();

/** Tap-to-start / tap-to-stop mic. Calls onFinal with the final transcript. */
export function useRecognition(lang: Lang, onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<AnyRecognition>(null);
  const finalRef = useRef("");
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    stopSpeaking(); // don't let the speaker hear our own TTS
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    finalRef.current = "";
    rec.onresult = (e: AnyRecognition) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim(finalRef.current + interimText);
    };
    rec.onerror = (e: AnyRecognition) => {
      if (e.error !== "no-speech" && e.error !== "aborted") setError(String(e.error));
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      const text = finalRef.current.trim();
      finalRef.current = "";
      recRef.current = null;
      if (text) onFinalRef.current(text);
    };
    setError(null);
    setInterim("");
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch (err) {
      setError(String(err));
    }
  }, [lang]);

  const toggle = useCallback(() => (recRef.current ? stop() : start()), [start, stop]);

  useEffect(() => () => recRef.current?.abort?.(), []);

  return { listening, interim, error, toggle, supported: recognitionSupported };
}

// ---------- Speech synthesis ----------

const synth: SpeechSynthesis | null = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;

function pickVoice(lang: Lang): SpeechSynthesisVoice | null {
  if (!synth) return null;
  const voices = synth.getVoices();
  const norm = (s: string) => s.replace("_", "-").toLowerCase();
  const want = lang.toLowerCase();
  const prefix = want.split("-")[0];
  return (
    voices.find((v) => norm(v.lang) === want) ||
    (lang === "zh-TW" ? voices.find((v) => /zh-(hant|tw)/i.test(norm(v.lang))) : undefined) ||
    voices.find((v) => norm(v.lang).startsWith(prefix)) ||
    null
  );
}

// Load voices early (Chrome fills them asynchronously).
if (synth) {
  synth.getVoices();
  synth.addEventListener?.("voiceschanged", () => synth.getVoices());
}

export function speak(text: string, lang: Lang) {
  if (!synth || !text) return;
  const u = new SpeechSynthesisUtterance(text.replace(/^\d\.\s*/gm, ""));
  u.lang = lang;
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.rate = lang === "zh-TW" ? 0.9 : 0.95;
  synth.speak(u);
}

export function stopSpeaking() {
  synth?.cancel();
}

/** Browsers block audio until the user taps; call this inside a click handler. */
export function unlockSpeech() {
  if (!synth) return;
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  synth.speak(u);
}
