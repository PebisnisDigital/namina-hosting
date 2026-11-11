import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../src/index.css";
import "../src/namana.css";
import { StaticSite } from "../src/pages/StaticSite";

// The export reuses the exact same content and UI as /vini. Vite compiles it
// into ordinary HTML, CSS, and browser JavaScript; no Node.js server is needed.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StaticSite slug="vini" />
  </StrictMode>,
);
