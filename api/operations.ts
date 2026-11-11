import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { inspectMedia } from "../server/media.js";
import { z } from "zod";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("invite"),
    payload: z.object({ email: z.email(), name: z.string().max(100) }).strict(),
  }),
  z.object({
    action: z.literal("resend"),
    payload: z.object({ userId: z.uuid() }).strict(),
  }),
  z.object({
    action: z.literal("finalize"),
    payload: z.object({ id: z.uuid() }).strict(),
  }),
  z.object({
    action: z.literal("cancel"),
    payload: z.object({ id: z.uuid() }).strict(),
  }),
  z.object({
    action: z.literal("media"),
    payload: z
      .object({
        id: z.uuid(),
        token: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .optional(),
      })
      .strict(),
  }),
]);
export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res
      .writeHead(405, { Allow: "POST" })
      .end(JSON.stringify({ error: "Metode tidak diizinkan." }));
    return;
  }
  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key =
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key || !service || url !== process.env.VITE_SUPABASE_URL) {
      res.writeHead(503).end(
        JSON.stringify({
          error: "Backend NAMINA belum dikonfigurasi atau proyek tidak cocok.",
        }),
      );
      return;
    }
    const body = requestSchema.parse(
      typeof req.body === "string" ? JSON.parse(req.body) : req.body,
    );
    const authorization =
      req.headers.authorization?.match(/^Bearer \S+$/)?.[0] || "";
    const userClient = createClient(url, key, {
      auth: { persistSession: false },
      global: {
        headers: authorization ? { Authorization: authorization } : {},
      },
    });
    const privileged = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Vercel overwrites x-forwarded-for. Only a salted hash is persisted, never the IP.
    const ip = String(
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown",
    ).split(",")[0];
    const rateKey = createHash("sha256")
      .update(service + ip)
      .digest("hex");
    const rate = await privileged.rpc("namana_api_rate", { p_key: rateKey });
    if (rate.error) {
      if (!rate.error.message.includes("rate_limit")) {
        res
          .writeHead(503)
          .end(
            JSON.stringify({
              error:
                "Backend NAMINA belum siap. Periksa migration dan konfigurasi server.",
            }),
          );
        return;
      }
      res.writeHead(429, { "Retry-After": "60" }).end(
        JSON.stringify({
          error: "Terlalu banyak permintaan. Coba lagi sebentar.",
        }),
      );
      return;
    }
    if (body.action === "media") {
      const { data: path, error } = await userClient.rpc(
        "namana_asset_access",
        { p_asset: body.payload.id, p_token: body.payload.token || null },
      );
      if (error || !path) {
        res
          .writeHead(404)
          .end(JSON.stringify({ error: "Media tidak tersedia." }));
        return;
      }
      const { data, error: signingError } = await privileged.storage
        .from("namana-media")
        .createSignedUrl(path, 300);
      if (signingError) throw signingError;
      res.end(JSON.stringify({ url: data.signedUrl }));
      return;
    }
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      res
        .writeHead(401)
        .end(JSON.stringify({ error: "Silakan login kembali." }));
      return;
    }
    if (body.action === "invite" || body.action === "resend") {
      const role = await userClient.rpc("namana_is_admin");
      if (role.error || !role.data) {
        res
          .writeHead(403)
          .end(JSON.stringify({ error: "Akses admin diperlukan." }));
        return;
      }
      const origin = process.env.APP_ORIGIN;
      if (!origin || new URL(origin).protocol !== "https:") {
        res
          .writeHead(503)
          .end(JSON.stringify({ error: "APP_ORIGIN NAMINA belum disetel." }));
        return;
      }
      if (body.action === "resend") {
        const profile = await privileged
          .from("namana_profiles")
          .select("email")
          .eq("user_id", body.payload.userId)
          .single();
        if (profile.error) throw profile.error;
        const reset = await privileged.auth.resetPasswordForEmail(
          profile.data.email,
          { redirectTo: `${origin}/auth` },
        );
        if (reset.error) throw reset.error;
        const audit = await privileged.from("namana_audit").insert({
          actor_id: user.id,
          action: "resend_access",
          details: { user: body.payload.userId },
        });
        if (audit.error) throw audit.error;
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      const { data, error } = await privileged.auth.admin.inviteUserByEmail(
        body.payload.email,
        { redirectTo: `${origin}/auth` },
      );
      if (error) {
        res.writeHead(400).end(
          JSON.stringify({
            error:
              "Undangan gagal. Periksa email, konfigurasi email, atau akun yang sudah terdaftar.",
          }),
        );
        return;
      }
      const profile = await privileged.from("namana_profiles").upsert({
        user_id: data.user.id,
        email: body.payload.email,
        display_name: body.payload.name,
      });
      if (profile.error) throw profile.error;
      const audit = await privileged.from("namana_audit").insert({
        actor_id: user.id,
        action: "invite",
        details: { user: data.user.id },
      });
      if (audit.error) throw audit.error;
      res.end(JSON.stringify({ id: data.user.id }));
      return;
    }
    const { data: asset, error } = await userClient
      .from("namana_assets")
      .select("*")
      .eq("id", body.payload.id)
      .single();
    if (error || !asset) {
      res
        .writeHead(404)
        .end(JSON.stringify({ error: "Media tidak tersedia." }));
      return;
    }
    if (body.action === "cancel") {
      if (asset.verified) {
        res.writeHead(409).end(
          JSON.stringify({
            error: "Media terverifikasi dipertahankan untuk riwayat versi.",
          }),
        );
        return;
      }
      const removed = await privileged.storage
        .from("namana-media")
        .remove([asset.storage_path]);
      if (removed.error) throw removed.error;
      const deletion = await privileged
        .from("namana_assets")
        .delete()
        .eq("id", asset.id)
        .eq("verified", false);
      if (deletion.error) throw deletion.error;
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (asset.verified) {
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    const { data: limits, error: limitsError } = await userClient
      .from("namana_settings")
      .select("*")
      .single();
    if (limitsError) throw limitsError;
    const { data: blob, error: downloadError } = await privileged.storage
      .from("namana-media")
      .download(asset.storage_path);
    if (downloadError) throw downloadError;
    if (
      blob.size !== asset.bytes ||
      blob.size >
        (asset.mime === "video/mp4" ? limits.video_bytes : limits.image_bytes)
    ) {
      res
        .writeHead(400)
        .end(JSON.stringify({ error: "Ukuran file tidak sesuai batas." }));
      return;
    }
    const buffer = Buffer.from(await blob.arrayBuffer());
    const metadata = await inspectMedia(buffer, asset.mime, limits);
    const saved = await privileged
      .from("namana_assets")
      .update({ verified: true, metadata })
      .eq("id", asset.id)
      .eq("verified", false);
    if (saved.error) throw saved.error;
    res.end(JSON.stringify({ ok: true }));
  } catch (error) {
    const invalid =
      error instanceof z.ZodError ||
      (error instanceof Error && error.message === "invalid_media");
    res.writeHead(invalid ? 400 : 500).end(
      JSON.stringify({
        error: invalid
          ? "Data atau media tidak valid."
          : "Operasi gagal. Coba lagi atau hubungi pengelola.",
      }),
    );
  }
}
