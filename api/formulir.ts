import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { clientBriefSchema } from "../src/domain/brief.js";
import { briefStore } from "./_brief-store.js";

type ApiRequest = IncomingMessage & { body?: unknown };

function sameOrigin(req: ApiRequest) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return false;
  try {
    const source = new URL(origin);
    const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
    return source.host === host && (source.protocol === "https:" || (local && source.protocol === "http:"));
  } catch {
    return false;
  }
}

async function readJson(req: ApiRequest) {
  if (req.body !== undefined) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > 65000) throw new Error("Formulir terlalu panjang.");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export default async function handler(req: ApiRequest, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Robots-Tag", "noindex");
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Gunakan formulir di halaman /formulir." }));
    return;
  }
  if (!sameOrigin(req) || !req.headers["content-type"]?.startsWith("application/json")) {
    res.statusCode = 403;
    res.end(JSON.stringify({ error: "Permintaan tidak diizinkan." }));
    return;
  }
  try {
    const data = z.object({
      brief: clientBriefSchema,
      websiteTrap: z.string().max(300),
    }).strict().parse(await readJson(req));
    if (data.websiteTrap) {
      res.statusCode = 200;
      res.end(JSON.stringify({ id: randomUUID() }));
      return;
    }
    const result = await briefStore("submit", { brief: data.brief }) as { id: string };
    res.statusCode = 201;
    res.end(JSON.stringify({ id: result.id }));
  } catch (cause) {
    res.statusCode = cause instanceof z.ZodError ? 400 : 503;
    const message = cause instanceof z.ZodError
      ? cause.issues[0]?.message || "Ada isian yang belum sesuai."
      : cause instanceof Error ? cause.message : "Gagal menyimpan formulir.";
    res.end(JSON.stringify({ error: message }));
  }
}
