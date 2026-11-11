import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = !!url && !!key;
export const supabase = configured ? createClient(url, key) : null;
export function db() {
  if (!supabase)
    throw new Error("Koneksi NAMINA belum dikonfigurasi. Hubungi pengelola.");
  return supabase;
}
export async function rpc<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await db().rpc(`namana_${name}`, args);
  if (error) {
    const messages: Record<string, string> = {
      revision_conflict:
        "Konflik versi. Perubahan tab ini belum disimpan. Salin perubahan atau muat versi server.",
      invalid_file:
        "Jenis atau ukuran file tidak didukung. Gunakan JPG, PNG, WebP, atau MP4 dalam batas upload.",
      quota_exceeded:
        "Kuota media penuh. Batalkan upload tertunda atau hubungi pengelola.",
      invalid_asset_ownership:
        "Media harus berasal dari website ini dan sudah terverifikasi.",
      invalid_asset_type: "Jenis media tidak cocok dengan elemen ini.",
      site_suspended:
        "Website ditangguhkan. Hubungi pengelola sebelum mempublikasikan.",
      forbidden: "Anda tidak memiliki akses untuk tindakan ini.",
      rate_limit:
        "Terlalu banyak perubahan. Tunggu sebentar sebelum mencoba kembali.",
    };
    const reason = Object.keys(messages).find((key) =>
      error.message.includes(key),
    );
    throw new Error(
      reason
        ? messages[reason]
        : error.code === "23505"
          ? "Slug sudah dipakai atau akun ini sudah memiliki website."
          : error.code === "23514"
            ? "Slug atau pengaturan tidak valid."
            : error.message,
    );
  }
  return data as T;
}
export async function api<T>(action: string, payload: unknown): Promise<T> {
  const { data } = await db().auth.getSession();
  const response = await fetch("/api/operations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(data.session
        ? { Authorization: `Bearer ${data.session.access_token}` }
        : {}),
    },
    body: JSON.stringify({ action, payload }),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Permintaan gagal. Coba lagi.");
  return result as T;
}
