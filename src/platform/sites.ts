import { api, db, rpc } from "./client";
import {
  assetIds,
  contentSchema,
  type AssetUrls,
  type SiteContent,
} from "../domain/content";

export type Site = {
  id: string;
  owner_id: string;
  slug: string;
  status: "active" | "suspended";
  published_version_id: string | null;
  published_revision: number | null;
  updated_at: string;
};
export type Draft = { site_id: string; content: SiteContent; revision: number };
export type Version = { id: string; created_at: string; revision: number };
export async function listSites(): Promise<Site[]> {
  const { data, error } = await db()
    .from("namana_sites")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}
export async function loadDraft(siteId: string): Promise<Draft> {
  const { data, error } = await db()
    .from("namana_drafts")
    .select("*")
    .eq("site_id", siteId)
    .single();
  if (error) throw error;
  return { ...data, content: contentSchema.parse(data.content) };
}
export async function mediaUrls(
  content: SiteContent,
  token?: string,
): Promise<AssetUrls> {
  const entries = await Promise.all(
    assetIds(content).map(async (id) => {
      const { url } = await api<{ url: string }>("media", { id, token });
      return [id, url];
    }),
  );
  return Object.fromEntries(entries);
}
export async function uploadMedia(siteId: string, file: File) {
  const reservation = await rpc<{ id: string; storage_path: string }>(
    "reserve_asset",
    { p_site: siteId, p_mime: file.type, p_bytes: file.size },
  );
  const { error } = await db()
    .storage.from("namana-media")
    .upload(reservation.storage_path, file, {
      contentType: file.type,
      upsert: false,
    });
  try {
    if (error) throw error;
    await api("finalize", { id: reservation.id });
  } catch (cause) {
    await api("cancel", { id: reservation.id }).catch(() => {});
    throw cause;
  }
  return reservation.id;
}
