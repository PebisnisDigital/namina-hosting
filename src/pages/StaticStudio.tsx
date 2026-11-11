import { useCallback, useEffect, useRef, useState } from "react";
import { ViniCinematic } from "../components/ViniCinematic";
import { slugSchema } from "../domain/content";
import { blankOriginal, viniOriginal } from "../static/originalSeed";
import { blankSite, prepareSite, resolveMedia, siteDocumentSchema, viniSeed, type SiteDocument } from "../static/sites";
import { BriefInbox } from "./BriefInbox";
import type { BriefRecord } from "../domain/brief";
import { OriginalStudioEditor } from "./OriginalStudioEditor";
import "../studio-static.css";

type Session = { authenticated: boolean; configured: boolean };
type StudioResponse = { slugs: string[] };
type FileResponse = { document: SiteDocument; sha: string };

async function callApi<T>(action: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/studio?action=${action}`, {
    credentials: "same-origin",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const result: unknown = await response.json();
  if (!response.ok) throw new Error((result as { error?: string }).error || `Permintaan gagal (${response.status}).`);
  return result as T;
}

const draftKey = (slug: string) => `namana:studio:draft:${slug}`;

function ensureOriginal(site: SiteDocument): SiteDocument {
  if (!site.content.original) {
    site.content.original = site.slug === "vini"
      ? structuredClone(viniOriginal)
      : blankOriginal(site.content.identity.displayName);
  }
  return site;
}

async function imageBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gambar gagal dibaca."));
    reader.readAsDataURL(file);
  });
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

function textList(value: string) {
  return value.split(/[\n,;]+/).map((text) => text.trim()).filter(Boolean).slice(0, 30);
}

function whatsappLink(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits.startsWith("0") ? `62${digits.slice(1)}` : digits}`;
}

export function StaticStudio() {
  const [session, setSession] = useState<Session | null>(null);
  const [password, setPassword] = useState("");
  const [slugs, setSlugs] = useState<string[]>([]);
  const [activeSlug, setActiveSlug] = useState("vini");
  const [newSlug, setNewSlug] = useState("");
  const [document, setDocument] = useState<SiteDocument | null>(null);
  const [sha, setSha] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localMediaPreviews, setLocalMediaPreviews] = useState<Record<string, string>>({});
  const [isPreview, setIsPreview] = useState(false);
  const [showBriefs, setShowBriefs] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const initialLoadStarted = useRef(false);
  const uploadedPreviewUrls = useRef<string[]>([]);

  const loadSlugs = useCallback(async () => {
    const result = await callApi<StudioResponse>("list");
    setSlugs(result.slugs.sort((a, b) => a.localeCompare(b)));
  }, []);

  useEffect(() => {
    callApi<Session>("session").then(setSession).catch((cause: Error) => setError(cause.message));
  }, []);

  useEffect(() => {
    if (session?.authenticated) loadSlugs().catch((cause: Error) => setError(cause.message));
  }, [session?.authenticated, loadSlugs]);

  const openSite = useCallback(async (slug: string) => {
    setWorking(true);
    setError("");
    setMessage("");
    setActiveSlug(slug);
    try {
      let site: SiteDocument;
      let remoteSha: string | null = null;
      try {
        const response = await callApi<FileResponse>(`site&slug=${encodeURIComponent(slug)}`);
        site = siteDocumentSchema.parse(response.document);
        remoteSha = response.sha;
      } catch (cause) {
        if (!(cause instanceof Error) || !cause.message.includes("Belum ada data")) throw cause;
        site = slug === "vini" ? structuredClone(viniSeed) : blankSite(slug);
      }
      const draft = localStorage.getItem(draftKey(slug));
      if (draft) {
        const parsed = siteDocumentSchema.safeParse(JSON.parse(draft));
        if (parsed.success && parsed.data.slug === slug) {
          site = parsed.data;
          setMessage("Draft lokal dipulihkan. Perubahan belum dipublikasikan.");
        }
      }
      setDocument(ensureOriginal(site));
      setSha(remoteSha);
      setIsPreview(false);
    } catch (cause) {
      setDocument(null);
      setError((cause as Error).message);
    } finally {
      setWorking(false);
    }
  }, []);

  useEffect(() => {
    if (session?.authenticated && slugs.length && !initialLoadStarted.current) {
      initialLoadStarted.current = true;
      void openSite(slugs.includes("vini") ? "vini" : slugs[0]);
    }
  }, [session?.authenticated, slugs, openSite]);

  const change = (update: (next: SiteDocument) => void) => {
    setDocument((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      update(next);
      localStorage.setItem(draftKey(next.slug), JSON.stringify(next));
      return next;
    });
    setError("");
    setMessage("Draft tersimpan di browser ini.");
  };

  const publish = async () => {
    if (!document) return;
    const checked = siteDocumentSchema.safeParse(prepareSite(document));
    if (!checked.success) {
      setError(checked.error.issues[0]?.message || "Periksa data sebelum terbit.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      const result = await callApi<{ ok: true; sha: string }>("publish", {
        method: "POST", body: JSON.stringify({ document: checked.data, sha }),
      });
      setSha(result.sha);
      setDocument(checked.data);
      localStorage.removeItem(draftKey(document.slug));
      setMessage("Perubahan dikirim ke GitHub. Vercel sedang menerbitkan website.");
      await loadSlugs();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const createSite = () => {
    const slug = newSlug.toLowerCase().trim();
    const parsed = slugSchema.safeParse(slug);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message || "Slug belum valid.");
    if (slugs.includes(slug)) return setError("Nama halaman sudah terpakai.");
    setDocument(blankSite(slug));
    setActiveSlug(slug);
    setSha(null);
    setNewSlug("");
    setIsPreview(false);
    setError("");
    setMessage("Klien baru memakai template Original. Isi data, lalu publikasikan.");
  };

  const prepareFromBrief = (brief: BriefRecord, chosenSlug: string) => {
    const suggested = chosenSlug || brief.website_slug || brief.requested_slug || brief.details.fullName
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
    const parsed = slugSchema.safeParse(suggested);
    if (!parsed.success) {
      setError("Nama halaman belum valid. Perbaiki slug sebelum menyiapkan draft.");
      return false;
    }
    if (slugs.includes(suggested)) {
      setError(`Halaman /${suggested} sudah ada. Buka melalui pilihan klien.`);
      return false;
    }
    const next = blankSite(suggested);
    const name = brief.details.displayName || brief.details.fullName;
    next.content.identity.displayName = name;
    next.content.identity.profession = brief.details.profession;
    next.content.identity.bio = brief.details.bio;
    next.content.original!.nama.items[0].value = name;
    next.content.original!.nama.description = brief.details.bio;
    next.content.original!.contactUrl = whatsappLink(brief.details.whatsapp);
    next.content.original!.karir.items = textList(brief.details.experience).map((value) => ({ id: crypto.randomUUID(), label: "Karir", value, icon: 8121304 }));
    next.content.original!.skill.items = textList(brief.details.skills).map((value) => ({ id: crypto.randomUUID(), label: "Skill", value, icon: 8121272 }));
    setDocument(next);
    setShowBriefs(false);
    setActiveSlug(suggested);
    setSha(null);
    setIsPreview(false);
    setMessage(`Draft /${suggested} siap dengan template Original. Lengkapi Karya, Produk, dan video sebelum publikasi.`);
    setError("");
    return true;
  };

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      await callApi("login", { method: "POST", body: JSON.stringify({ password }) });
      setSession({ configured: true, authenticated: true });
      setPassword("");
    } catch (cause) { setError((cause as Error).message); }
    finally { setWorking(false); }
  };

  const logout = async () => {
    await callApi("logout", { method: "POST", body: "{}" }).catch(() => {});
    setSession({ configured: true, authenticated: false });
    setDocument(null);
    setSlugs([]);
    initialLoadStarted.current = false;
  };

  useEffect(() => () => { uploadedPreviewUrls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);

  const uploadGallery = async (id: string, file: File) => {
    if (!document) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 1300000) {
      setError("Gunakan foto JPG, PNG, atau WebP maksimal 1,3 MB.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const result = await callApi<{ url: string }>("upload", {
        method: "POST", body: JSON.stringify({ slug: document.slug, mime: file.type, base64: await imageBase64(file) }),
      });
      const previewUrl = URL.createObjectURL(file);
      uploadedPreviewUrls.current.push(previewUrl);
      setLocalMediaPreviews((previews) => ({ ...previews, [result.url]: previewUrl }));
      change((next) => { next.media.cards[id] = result.url; });
      setMessage("Gambar terunggah. Klik Publikasikan untuk memperbarui website.");
    } catch (cause) { setError((cause as Error).message); }
    finally { setUploading(false); }
  };

  if (!session) return <main className="studio-gate">
    {error ? <div className="studio-gate__card" role="alert"><h1>Studio tidak dapat dihubungi</h1><p>{error}</p><button type="button" onClick={() => location.reload()}>Coba lagi</button></div>
      : <p role="status">Memeriksa akses Studio…</p>}
  </main>;

  if (!session.configured || !session.authenticated) return <main className="studio-gate"><div className="studio-gate__card">
    <a className="studio-wordmark" href="/">NAMINA</a>
    <h1>{session.configured ? "Masuk Studio" : "Studio menunggu konfigurasi"}</h1>
    {session.configured ? <form onSubmit={login}>
      <label htmlFor="studio-password">Kata sandi tim admin</label>
      <input id="studio-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      <button type="submit" disabled={working}>{working ? "Memeriksa…" : "Masuk Studio"}</button>
    </form> : <p>Konfigurasi Studio belum lengkap. Hubungi pengelola NAMINA.</p>}
    {error && <p className="studio-alert studio-alert--error" role="alert">{error}</p>}
    <a href="/vini">Lihat template Original</a>
  </div></main>;

  const prepared = document ? prepareSite(document) : null;
  const assetUrls = prepared ? Object.fromEntries(
    Object.entries(resolveMedia(prepared)).map(([id, url]) => [id, localMediaPreviews[url] || url]),
  ) : {};

  return <main className="studio-root">
    <header className="studio-header">
      <a className="studio-wordmark" href="/">NAMINA</a>
      <strong>Studio <span className="studio-header__separator">/</span> Original</strong>
      <div className="studio-header__actions">
        <button type="button" aria-pressed={showBriefs} onClick={() => setShowBriefs((value) => !value)}>{showBriefs ? "Kembali edit" : "Formulir klien"}</button>
        {document && <a href={`/${document.slug}`} target="_blank" rel="noreferrer">Buka website</a>}
        <button type="button" onClick={() => void logout()}>Keluar</button>
      </div>
    </header>
    {showBriefs ? <div className="studio-brief-view"><BriefInbox onPrepare={prepareFromBrief} /></div> : <div className={`studio-workspace${isPreview ? " studio-workspace--preview" : ""}`}>
      <aside className="studio-sidebar" aria-label="Editor klien">
        <section className="studio-client">
          <h1>Editor website <span>Original</span></h1>
          <label htmlFor="site-picker">Pilih klien</label>
          <select id="site-picker" value={slugs.includes(activeSlug) ? activeSlug : ""} onChange={(event) => void openSite(event.target.value)}>
            {!slugs.includes(activeSlug) && <option value="">Klien baru (draft)</option>}
            {slugs.map((slug) => <option key={slug} value={slug}>/{slug}</option>)}
          </select>
          <details className="studio-client__new" key={activeSlug}><summary>+ Buat website klien baru</summary>
            <div className="studio-inline">
              <label htmlFor="new-client-slug">Alamat halaman</label>
              <input id="new-client-slug" placeholder="nama-klien" value={newSlug} onChange={(event) => setNewSlug(event.target.value)} />
              <button type="button" onClick={createSite}>Buat</button>
            </div>
          </details>
        </section>
        {document && <OriginalStudioEditor key={document.slug} site={document} change={change} uploading={uploading} onUpload={(id, file) => void uploadGallery(id, file)} previews={localMediaPreviews} />}
      </aside>
      <section className="studio-main" aria-label="Pratinjau website">
        <div className="studio-main__toolbar">
          <div><strong>{document ? `/${document.slug}` : "Belum ada website"}</strong>
            <span>{isPreview ? "Pratinjau lebar" : "Pratinjau langsung"}</span>
          </div>
          <button type="button" aria-pressed={isPreview} onClick={() => setIsPreview((value) => !value)}>{isPreview ? "Kembali edit" : "Perbesar preview"}</button>
          <button type="button" className="studio-publish" disabled={!document || working || uploading} onClick={() => void publish()}>
            {working ? "Memproses…" : "Publikasikan"}
          </button>
        </div>
        {error && <p role="alert" className="studio-alert studio-alert--error">{error}</p>}
        {message && <p role="status" className="studio-alert">{message}</p>}
        <div className="studio-preview studio-preview--original">
          {working && !document ? <p role="status">Memuat website…</p> : prepared ?
            <ViniCinematic key={prepared.slug} content={prepared.content} assetUrls={assetUrls} previewMode />
            : <p>Pilih klien atau buat website baru.</p>}
        </div>
      </section>
    </div>}
  </main>;
}
