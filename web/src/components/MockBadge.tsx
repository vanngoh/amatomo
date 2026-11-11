import { useEffect, useState } from "react";
import { onMockMode } from "../api";

export function MockBadge({ fromFeed }: { fromFeed?: boolean }) {
  const [mock, setMock] = useState(false);
  useEffect(() => {
    const off = onMockMode(setMock);
    return () => {
      off();
    };
  }, []);
  if (!mock && !fromFeed) return null;
  return <span className="mock-badge" title="No GMI_API_KEY: translations and advice are mocked">MOCK MODE</span>;
}
