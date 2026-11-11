import { createClient } from "npm:@supabase/supabase-js@2";

// This hash identifies the server-to-server gateway. Its raw key lives only in Vercel.
const GATEWAY_KEY_SHA256 = "b33fd65e11d0659c236645a70d2db9a95032e5882f5b7b3400bed2199fb258ea";
const encoder = new TextEncoder();

function respond(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

async function allowed(req: Request) {
  const supplied = req.headers.get("x-namina-gateway-secret") || "";
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(supplied)));
  const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  let difference = 0;
  for (let index = 0; index < hex.length; index++) difference |= hex.charCodeAt(index) ^ GATEWAY_KEY_SHA256.charCodeAt(index);
  return difference === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return respond(405, { error: "Metode tidak didukung." });
  if (!(await allowed(req))) return respond(401, { error: "Akses ditolak." });
  try {
    const projectUrl = Deno.env.get("SUPABASE_URL");
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}") as Record<string, string>;
    const serviceKey = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!projectUrl || !serviceKey) return respond(503, { error: "Database belum siap." });
    const db = createClient(projectUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json() as Record<string, unknown>;
    const action = body.action;

    if (action === "submit") {
      const brief = body.brief as Record<string, unknown> | null;
      if (!brief || typeof brief.fullName !== "string" || typeof brief.profession !== "string"
        || typeof brief.whatsapp !== "string" || brief.consent !== true) {
        return respond(400, { error: "Biodata belum lengkap." });
      }
      const { data, error } = await db.from("namina_client_briefs").insert({
        full_name: brief.fullName,
        profession: brief.profession,
        whatsapp: brief.whatsapp,
        requested_slug: brief.requestedSlug || null,
        details: brief,
      }).select("id").single();
      if (error) throw error;
      return respond(201, { id: data.id });
    }

    if (action === "list") {
      const { data, error } = await db.from("namina_client_briefs")
        .select("id,full_name,profession,status,requested_slug,website_slug,created_at")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return respond(200, { briefs: data });
    }

    if (action === "detail") {
      const id = typeof body.id === "string" ? body.id : "";
      if (!/^[a-f0-9-]{36}$/.test(id)) return respond(400, { error: "ID formulir tidak valid." });
      const { data, error } = await db.from("namina_client_briefs")
        .select("id,full_name,profession,status,requested_slug,website_slug,created_at,details")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) return respond(404, { error: "Formulir tidak ditemukan." });
      return respond(200, { brief: data });
    }

    if (action === "update") {
      const id = typeof body.id === "string" ? body.id : "";
      const status = body.status;
      const websiteSlug = body.websiteSlug;
      if (!/^[a-f0-9-]{36}$/.test(id) || !["pending", "in_progress", "completed"].includes(String(status))
        || typeof websiteSlug !== "string"
        || (websiteSlug && !/^[a-z0-9][a-z0-9-]{1,47}$/.test(websiteSlug))
        || (status === "completed" && !websiteSlug)) {
        return respond(400, { error: "Status atau alamat website tidak valid." });
      }
      const { data, error } = await db.from("namina_client_briefs").update({
        status,
        website_slug: websiteSlug || null,
        updated_at: new Date().toISOString(),
      }).eq("id", id).select("id,status,website_slug").maybeSingle();
      if (error) throw error;
      if (!data) return respond(404, { error: "Formulir tidak ditemukan." });
      return respond(200, { brief: data });
    }

    return respond(400, { error: "Aksi tidak didukung." });
  } catch {
    return respond(503, { error: "Database formulir sedang bermasalah. Coba lagi." });
  }
});
