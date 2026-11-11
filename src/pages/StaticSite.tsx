import { useEffect, useState } from "react";
import { slugSchema } from "../domain/content";
import { ViniCinematic } from "../components/ViniCinematic";
import { NaminaIntroStage } from "../components/NaminaLogo";
import { createNaminaIntroSound } from "../components/naminaIntroSound";
import { normalizeSite, resolveMedia, siteDocumentSchema, viniSeed, type SiteDocument } from "../static/sites";
import { viniOriginal } from "../static/originalSeed";
import { Shell } from "./shared";

type SiteState =
  | { status: "loading" }
  | { status: "ready"; document: SiteDocument }
  | { status: "missing" }
  | { status: "error" };

export function StaticSite({ slug }: { slug: string }) {
  const [state, setState] = useState<SiteState>({ status: "loading" });
  const [introStart, setIntroStart] = useState<number | null>(() => slug === "vini" ? Date.now() : null);

  useEffect(() => {
    if (slug === "vini" && introStart === null) setIntroStart(Date.now());
    else if (slug !== "vini" && introStart !== null) setIntroStart(null);
  }, [slug, introStart]);

  useEffect(() => {
    if (slug !== "vini") return;
    const sound = createNaminaIntroSound();
    // Attempt the sound automatically; browsers may block it without a user gesture.
    void sound.play();
    return () => {
      sound.dispose();
    };
  }, [slug]);

  useEffect(() => {
    const controller = new AbortController();
    if (!slugSchema.safeParse(slug).success) {
      setState({ status: "missing" });
      return () => controller.abort();
    }
    setState({ status: "loading" });
    fetch(`/clients/${slug}.json`, { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error("Gagal mengakses data klien.");
        const data: unknown = await response.json();
        return siteDocumentSchema.parse(data);
      })
      .then((document) => {
        if (controller.signal.aborted) return;
        if (document?.slug === slug) setState({ status: "ready", document: normalizeSite(document) });
        else if (slug === "vini") setState({ status: "ready", document: normalizeSite(viniSeed) });
        else setState({ status: "missing" });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        if (slug === "vini") setState({ status: "ready", document: normalizeSite(viniSeed) });
        else setState({ status: "error" });
      });
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (state.status !== "ready") return;
    document.title = `${state.document.content.identity.displayName} | NamiNa`;
  }, [state]);

  if (state.status === "ready") {
    return <ViniCinematic key={slug} content={state.document.content} assetUrls={resolveMedia(state.document)} introStartedAt={introStart ?? undefined} fallbackOriginal={slug === "vini" ? viniOriginal : undefined} />;
  }

  if (slug === "vini" && state.status === "loading") {
    return (
      <main className="namina-initial-loader" aria-label="Menyiapkan profil NAMINA">
        <NaminaIntroStage startedAt={introStart ?? undefined} />
        <span className="cinematic-welcome__sr-only" role="status">
          Menyiapkan video profil.
        </span>
      </main>
    );
  }

  return (
    <Shell>
      <main className="page" aria-live="polite">
        {state.status === "loading" ? (
          <p role="status">Memuat website klien…</p>
        ) : state.status === "missing" ? (
          <>
            <h1>Website belum tersedia</h1>
            <p>Alamat ini belum memiliki halaman NAMINA yang dipublikasikan.</p>
            <a href="/">Kembali ke NAMINA</a>
          </>
        ) : (
          <>
            <h1>Website gagal dimuat</h1>
            <p>Coba segarkan halaman. Jika masih gagal, hubungi tim NAMINA.</p>
            <button type="button" onClick={() => window.location.reload()}>Muat ulang</button>
          </>
        )}
      </main>
    </Shell>
  );
}
