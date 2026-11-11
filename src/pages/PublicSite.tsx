import { useEffect } from "react";
import { contentSchema } from "../domain/content";
import { rpc } from "../platform/client";
import { ViniCinematic } from "../components/ViniCinematic";
import { Notice, Shell } from "./shared";
import { useLoad, useMediaUrls } from "../platform/hooks";
export function PublicSite({ slug, token }: { slug?: string; token?: string }) {
  const { data, error, reload } = useLoad(async () => {
    const result = await rpc<{ content: unknown } | null>(
      token ? "preview" : "public_site",
      token ? { p_token: token } : { p_slug: slug },
    );
    if (!result)
      throw new Error(
        token
          ? "Preview tidak tersedia, kedaluwarsa, atau telah dicabut."
          : "Website tidak ditemukan atau belum dipublikasikan.",
      );
    const content = contentSchema.parse(result.content);
    return { content };
  }, [slug, token]);
  const { urls } = useMediaUrls(data?.content || null, token);
  useEffect(() => {
    if (token) {
      document.querySelector('meta[name="robots"]')?.remove();
      const meta = document.createElement("meta");
      meta.name = "robots";
      meta.content = "noindex, nofollow";
      document.head.append(meta);
      return () => meta.remove();
    }
  }, [token]);
  useEffect(() => {
    if (data)
      document.title = `${data.content.identity.displayName} | NamiNa`;
  }, [data]);
  if (error)
    return (
      <Shell>
        <main className="page">
          <h1>{token ? "Preview privat" : "Website tidak tersedia"}</h1>
          <Notice error>{error}</Notice>
          <button onClick={reload}>Coba lagi</button>
        </main>
      </Shell>
    );
  if (!data) return <Notice>Memuat website…</Notice>;
  return <ViniCinematic content={data.content} assetUrls={urls} />;
}
