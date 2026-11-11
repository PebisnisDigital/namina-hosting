import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../src/index.css";
import { ViniCinematic } from "../src/components/ViniCinematic";
import { normalizeSite, resolveMedia, siteDocumentSchema, type SiteDocument } from "../src/static/sites";

function Preview() {
  const [site, setSite] = useState<SiteDocument | null>(null);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== "namina-preview") return;
      const parsed = siteDocumentSchema.safeParse(event.data.document);
      if (parsed.success) setSite(normalizeSite(parsed.data));
    };
    window.addEventListener("message", listener);
    window.parent.postMessage({ type: "namina-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", listener);
  }, []);
  if (!site) return <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#0a090e", color: "#e8dfdc", fontFamily: "sans-serif" }} role="status">Menyiapkan pratinjau…</main>;
  return <ViniCinematic content={site.content} assetUrls={resolveMedia(site)} previewMode />;
}

createRoot(document.getElementById("root")!).render(<StrictMode><Preview /></StrictMode>);
