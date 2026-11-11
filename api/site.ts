import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
const systemRoutes = new Set([
  "admin",
  "api",
  "login",
  "logout",
  "dashboard",
  "studio",
  "preview",
  "assets",
  "auth",
  "settings",
  "checkout",
  "register",
  "help",
  "www",
  "new",
  "demo",
  "canvas",
  "privacy",
  "terms",
  "support",
]);
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse,
) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  const mode = req.query?.mode;
  const slug = req.query?.slug;
  try {
    if (mode === "robots") {
      res.setHeader("Content-Type", "text/plain");
      res.end(
        "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /studio\nDisallow: /preview\nDisallow: /dashboard\nDisallow: /api\n",
      );
      return;
    }
    const template = () =>
      readFile(new URL("../dist/index.html", import.meta.url), "utf8");
    if (typeof slug === "string" && systemRoutes.has(slug)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      if (!["demo", "privacy", "terms"].includes(slug))
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.end(await template());
      return;
    }
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key =
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key || url !== process.env.VITE_SUPABASE_URL) {
      res
        .writeHead(503, {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": "60",
        })
        .end("Backend NAMINA belum dikonfigurasi.");
      return;
    }
    const client = createClient(url, key, { auth: { persistSession: false } });
    if (mode === "sitemap") {
      const origin = process.env.APP_ORIGIN;
      if (!origin || !origin.startsWith("https://"))
        throw Error("missing_origin");
      const { data, error } = await client.rpc("namana_sitemap");
      if (error) throw error;
      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Cache-Control", "public, max-age=60");
      res.end(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${(data as { slug: string; updated_at: string }[]).map((s) => `<url><loc>${escapeHtml(origin)}/${escapeHtml(s.slug)}</loc><lastmod>${new Date(s.updated_at).toISOString()}</lastmod></url>`).join("")}</urlset>`,
      );
      return;
    }
    if (
      typeof slug !== "string" ||
      !/^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/.test(slug)
    ) {
      res.writeHead(404).end("Website tidak ditemukan.");
      return;
    }
    const { data, error } = await client.rpc("namana_public_site", {
      p_slug: slug,
    });
    if (error) throw error;
    if (!data) {
      res
        .writeHead(404, {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        })
        .end("Website tidak ditemukan atau belum dipublikasikan.");
      return;
    }
    const identity = data.content.identity as {
      displayName: string;
      bio: string;
    };
    const title = escapeHtml(`${identity.displayName} | NAMINA.PRO`);
    const description = escapeHtml(identity.bio);
    let html = (await template())
      .replace(/<title>.*?<\/title>/s, () => `<title>${title}</title>`)
      .replace(
        /<meta name="description"[^>]*>/,
        () => `<meta name="description" content="${description}" />`,
      );
    const origin = process.env.APP_ORIGIN;
    const meta = `<meta property="og:title" content="${title}"/><meta property="og:description" content="${description}"/><meta property="og:type" content="profile"/>${origin ? `<link rel="canonical" href="${escapeHtml(origin)}/${escapeHtml(slug)}"/>` : ""}`;
    html = html.replace("</head>", () => `${meta}</head>`);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(html);
  } catch {
    res
      .writeHead(503, {
        "Content-Type": "text/plain; charset=utf-8",
        "Retry-After": "60",
      })
      .end("Website sementara tidak tersedia.");
  }
}
