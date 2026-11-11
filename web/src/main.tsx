import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Demo } from "./pages/Demo";
import { Landing } from "./pages/Landing";
import { Room } from "./pages/Room";
import "./styles.css";

function App() {
  const path = location.pathname.replace(/\/+$/, "");
  if (path.startsWith("/room/")) return <Room />;
  if (path === "/demo") return <Demo />;
  return <Landing />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
