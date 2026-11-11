import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../src/index.css";
import { StaticSite } from "../src/pages/StaticSite";

const metaSlug = document.querySelector<HTMLMetaElement>('meta[name="namina-site-slug"]')?.content;
const pathSlug = window.location.pathname.split("/").filter(Boolean)[0] || "";
const slug = metaSlug && metaSlug !== "NAMINA_SITE_SLUG_PLACEHOLDER" ? metaSlug : pathSlug;

createRoot(document.getElementById("root")!).render(
  <StrictMode><StaticSite slug={slug} /></StrictMode>,
);
