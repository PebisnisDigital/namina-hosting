import { useCallback, useEffect, useRef, useState } from "react";
import { slugSchema } from "../domain/content";
import { blankSite, prepareSite, siteDocumentSchema, type SiteDocument } from "../static/sites";
import { OriginalStudioEditor } from "./OriginalStudioEditor";
import "../studio-static.css";

type Policy = "self" | "approval";
type Step = "data" | "media" | "preview";
type ClientSummary = {
  slug: string; policy: Policy; revision: number;
  publishedRevision: number; pendingRevision: number | null; updatedAt: string;
};
type Session = { role: "admin"; clients: ClientSummary[] } | { role: "client"; slug: string };
type SiteRecord = ClientSummary & { document: SiteDocument; brief?: string };
type ApiError = { error?: string };

const storageToken = "namina:generator:access";

async function api<T>(token: string, action: string, data?: object): Promise<T> {
  const response = await fetch(`/api/generator.php?action=${action}`, {
    method: data ? "POST" : "GET",
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, ...(data ? { "Content-Type": "application/json" } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  const result: unknown = await response.json().catch(() => ({ error: "Server belum menyediakan API generator PHP." }));
  if (!response.ok) throw new Error((result as ApiError).error || `Permintaan gagal (${response.status}).`);
  return result as T;
}

function applyBrief(site: SiteDocument, brief: string): SiteDocument {
  const next = structuredClone(site);
  const lines = brief.split(/\r?\n/);
  const fields: Record<string, string> = {};
  for (const line of lines) {
    const match = line.match(/^\s*(nama(?: lengkap)?|profesi|pekerjaan|bio|tentang|wa|whatsapp|skill|keahlian|pengalaman|karir)\s*:\s*(.+)$/i);
    if (match) fields[match[1].toLowerCase()] = match[2].trim();
  }
  const name = fields["nama lengkap"] || fields.nama;
  if (name) {
    next.content.identity.displayName = name.slice(0, 60);
    if (next.content.original?.nama.items[0]) next.content.original.nama.items[0].value = name.slice(0, 180);
  }
  const profession = fields.profesi || fields.pekerjaan;
  if (profession) next.content.identity.profession = profession.slice(0, 70);
  const bio = fields.bio || fields.tentang;
  if (bio) {
    next.content.identity.bio = bio.slice(0, 1200);
    if (next.content.original) next.content.original.nama.description = bio.slice(0, 400);
  }
  const wa = (fields.whatsapp || fields.wa || "").replace(/\D/g, "");
  if (wa && next.content.original) next.content.original.contactUrl = `https://wa.me/${wa.startsWith("0") ? `62${wa.slice(1)}` : wa}`;
  for (const [source, section, icon] of [[fields.skill || fields.keahlian, "skill", 8121272], [fields.karir || fields.pengalaman, "karir", 8121304]] as const) {
    if (!source || !next.content.original) continue;
    next.content.original[section].items = source.split(/[,;]+/).map((value) => value.trim()).filter(Boolean).slice(0, 30).map((value) => ({
      id: crypto.randomUUID(), label: section === "skill" ? "Skill" : "Karir", value: value.slice(0, 180), icon,
    }));
  }
  return next;
}

function validDraft(site: SiteDocument): SiteDocument {
  const result = siteDocumentSchema.safeParse(prepareSite(site));
  if (!result.success) throw new Error(result.error.issues[0]?.message || "Periksa kelengkapan data terlebih dahulu.");
  return result.data;
}

export function Generator() {
  const [token, setToken] = useState(() => {
    const url = new URL(window.location.href);
    const hashToken = new URLSearchParams(url.hash.slice(1)).get("token");
    const provided = hashToken || url.searchParams.get("token") || url.searchParams.get("key");
    if (provided) {
      sessionStorage.setItem(storageToken, provided);
      url.searchParams.delete("token");
      url.searchParams.delete("key");
      history.replaceState(null, "", url.pathname + url.search);
      return provided;
    }
    return sessionStorage.getItem(storageToken) || "";
  });
  const [inputToken, setInputToken] = useState("");
  const [loadingAccess, setLoadingAccess] = useState(() => !!token);
  const [session, setSession] = useState<Session | null>(null);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [record, setRecord] = useState<SiteRecord | null>(null);
  const [draft, setDraft] = useState<SiteDocument | null>(null);
  const [dirty, setDirty] = useState(false);
  const [slugInput, setSlugInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [brief, setBrief] = useState("");
  const [policyInput, setPolicyInput] = useState<Policy>("approval");
  const [newLink, setNewLink] = useState("");
  const [step, setStep] = useState<Step>("data");
  const [device, setDevice] = useState<"desktop" | "mobile">("mobile");
  const [scale, setScale] = useState(1);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const previewRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const reloadClients = useCallback(async () => {
    if (!token) return;
    const result = await api<Session>(token, "session");
    setSession(result);
    if (result.role === "admin") setClients(result.clients);
    return result;
  }, [token]);

  const openSite = useCallback(async (slug: string, preserveStep = false) => {
    if (!token) return;
    setWorking(true);
    setError("");
    setNewLink("");
    try {
      const response = await api<{ site: SiteRecord }>(token, `site&slug=${encodeURIComponent(slug)}`);
      const checked = siteDocumentSchema.parse(response.site.document);
      setRecord(response.site);
      setDraft(checked);
      setDirty(false);
      if (!preserveStep) setStep("data");
      setMessage("");
    } catch (cause) { setError((cause as Error).message); }
    finally { setWorking(false); }
  }, [token]);

  useEffect(() => {
    if (!token) { setLoadingAccess(false); return; }
    let cancelled = false;
    setLoadingAccess(true);
    void api<Session>(token, "session").then((result) => {
      if (cancelled) return;
      setSession(result);
      if (result.role === "admin") {
        setClients(result.clients);
        if (result.clients.length) void openSite(result.clients[0].slug);
      } else void openSite(result.slug);
    }).catch((cause: Error) => { if (!cancelled) setError(cause.message); })
      .finally(() => { if (!cancelled) setLoadingAccess(false); });
    return () => { cancelled = true; };
  }, [token, openSite]);

  useEffect(() => {
    const send = () => {
      if (!draft || !previewRef.current?.contentWindow) return;
      previewRef.current.contentWindow.postMessage({ type: "namina-preview", document: prepareSite(draft) }, window.location.origin);
    };
    const listen = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === previewRef.current?.contentWindow && event.data?.type === "namina-preview-ready") send();
    };
    window.addEventListener("message", listen);
    send();
    return () => window.removeEventListener("message", listen);
  }, [draft]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const resize = () => {
      const available = Math.max(280, (canvasRef.current?.clientWidth || 390) - 28);
      setScale(Math.min(1, available / (device === "mobile" ? 390 : 1200)));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [device, record, step]);

  const change = (mutate: (next: SiteDocument) => void) => {
    setDraft((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      mutate(next);
      return next;
    });
    setDirty(true);
    setMessage("");
    setError("");
  };

  const withAction = async (operation: () => Promise<void>) => {
    setWorking(true);
    setError("");
    try { await operation(); }
    catch (cause) { setError((cause as Error).message); }
    finally { setWorking(false); }
  };

  const create = () => void withAction(async () => {
    if (!session || session.role !== "admin") return;
    const slug = slugInput.toLowerCase().trim();
    if (["vini", "vinihtml"].includes(slug)) throw new Error("Alamat contoh resmi NAMINA tidak bisa dijadikan slug klien.");
    const check = slugSchema.safeParse(slug);
    if (!check.success) throw new Error(check.error.issues[0]?.message || "Alamat website tidak valid.");
    if (clients.some((site) => site.slug === slug)) throw new Error("Alamat sudah digunakan.");
    const doc = blankSite(slug);
    if (nameInput.trim()) {
      doc.content.identity.displayName = nameInput.trim().slice(0, 60);
      doc.content.original!.nama.items[0].value = nameInput.trim().slice(0, 180);
    }
    const prepared = validDraft(applyBrief(doc, brief));
    const result = await api<{ token: string; slug: string }>(token, "create", { slug, policy: policyInput, document: prepared, brief });
    const link = `${location.origin}/generator/#token=${result.token}`;
    setNewLink(link);
    setSlugInput(""); setNameInput(""); setBrief("");
    await reloadClients();
    await openSite(slug);
    setNewLink(link);
    setMessage(`Website /${slug} siap diedit. Salin tautan pribadi sebelum meninggalkan halaman ini.`);
  });

  const save = () => void withAction(async () => {
    if (!record || !draft) return;
    const checked = validDraft(draft);
    const result = await api<{ revision: number }>(token, "save", { slug: record.slug, document: checked, expectedRevision: record.revision });
    setRecord({ ...record, document: checked, revision: result.revision, pendingRevision: null });
    setDraft(checked); setDirty(false);
    setMessage("Draft aman tersimpan. Website publik belum berubah.");
    if (session?.role === "admin") await reloadClients();
  });

  const publish = () => void withAction(async () => {
    if (!record) return;
    if (dirty) throw new Error("Simpan draft terbaru sebelum melanjutkan.");
    const result = await api<{ status: "pending" | "published" }>(token, "publish", { slug: record.slug, expectedRevision: record.revision });
    setMessage(result.status === "published" ? `Website /${record.slug} sudah terbit.` : "Permintaan publish terkirim. Tunggu persetujuan admin NAMINA.");
    await openSite(record.slug, true);
    if (session?.role === "admin") await reloadClients();
    setMessage(result.status === "published" ? `Website /${record.slug} sudah terbit.` : "Permintaan publish terkirim. Tunggu persetujuan admin NAMINA.");
  });

  const review = (decision: "approve" | "reject") => void withAction(async () => {
    if (!record) return;
    await api(token, "review", { slug: record.slug, decision, expectedRevision: record.revision });
    await openSite(record.slug, true);
    await reloadClients();
    setMessage(decision === "approve" ? "Revisi disetujui dan langsung terbit." : "Permintaan ditolak. Website publik tidak berubah.");
  });

  const setPolicy = (policy: Policy) => void withAction(async () => {
    if (!record) return;
    await api(token, "policy", { slug: record.slug, policy });
    setRecord({ ...record, policy });
    await reloadClients();
    setMessage(policy === "self" ? "Klien kini boleh publish sendiri." : "Publish klien kini memerlukan persetujuan admin.");
  });

  const rotate = () => void withAction(async () => {
    if (!record) return;
    if (!window.confirm(`Ganti link edit /${record.slug}? Link lama akan langsung berhenti berlaku.`)) return;
    const result = await api<{ token: string }>(token, "rotate", { slug: record.slug });
    setNewLink(`${location.origin}/generator/#token=${result.token}`);
    setMessage("Link baru siap disalin. Link lama sudah dicabut.");
  });

  const download = () => void withAction(async () => {
    if (!record) return;
    if (dirty) throw new Error("Simpan draft terlebih dulu agar file unduhan sesuai perubahan terbaru.");
    const response = await fetch("/api/generator.php?action=download", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ slug: record.slug }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as ApiError;
      throw new Error(body.error || "Paket HTML gagal disiapkan.");
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url; link.download = `namina-${record.slug}.zip`;
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setMessage("Paket HTML diunduh. Ekstrak ZIP lalu unggah ke hosting tujuan.");
  });

  const loginLink = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^[a-f0-9]{64}$/.test(inputToken)) { setError("Masukkan token 64 karakter dari link editor pribadi."); return; }
    sessionStorage.setItem(storageToken, inputToken);
    setToken(inputToken);
    setLoadingAccess(true);
    setError("");
  };

  const exit = () => {
    sessionStorage.removeItem(storageToken);
    setToken(""); setInputToken(""); setLoadingAccess(false); setSession(null); setRecord(null); setDraft(null); setClients([]); setNewLink(""); setError("");
  };

  const goToStep = (next: Step) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const noSession = !session;
  return <main className="generator-root studio-root">
    <header className="generator-topbar">
      <a href="/" className="generator-brand"><span aria-hidden="true">N</span><strong>NAMINA</strong></a>
      <div className="generator-topbar__right">
        <span className="generator-eyebrow">GENERATOR WEBSITE</span>
        {session && <button type="button" onClick={exit}>Tutup editor</button>}
      </div>
    </header>

    {noSession && loadingAccess ? <section className="generator-gate" role="status"><p className="generator-kicker">MEMERIKSA AKSES</p><h1>Menyiapkan <em>generator.</em></h1><p>Memuat data website dan izin publish…</p></section> : noSession ? <section className="generator-gate">
      <p className="generator-kicker">AKSES PRIVAT / NAMINA</p>
      <h1>Website punya kamu. <em>Kontrol juga.</em></h1>
      <p>Setiap klien mendapat link editor khusus dari admin melalui WhatsApp. Buka link itu untuk mengubah data, video, warna, dan kartu website.</p>
      <form onSubmit={loginLink} className="generator-gate__form">
        <label htmlFor="access-token">Token dari link pribadi</label>
        <input id="access-token" type="password" value={inputToken} onChange={(event) => setInputToken(event.target.value.trim())} placeholder="Tempel token dari admin" autoComplete="off" />
        <button type="submit">Buka generator</button>
      </form>
      {error && <p role="alert" className="generator-message generator-message--error">{error}</p>}
      <p className="generator-aside">Tidak perlu akun atau password. Simpan link pribadi seperti kunci rumah: siapa pun yang memegangnya bisa mengedit website.</p>
      <a href="/vini/">Lihat template Teh Vini</a>
    </section> : <>
      <div className="generator-app">
        <div className="generator-toolbar">
          <span className="generator-eyebrow">{session.role === "admin" ? "PANEL PEMILIK" : "EDITOR PRIBADI"}</span>
          <h1>Bikin web. <span>Tiga langkah.</span></h1>
          <p>Isi profil, pasang media, lalu lihat hasilnya sebelum terbit.</p>
        </div>

        <nav className="generator-steps" aria-label="Tahap generator">
          {([ ["data", "Isi data"], ["media", "Media"], ["preview", "Hasil jadi"] ] as const).map(([value, label], index) =>
            <button type="button" key={value} className={`generator-steps__item${step === value ? " is-active" : ""}`}
              aria-current={step === value ? "step" : undefined} disabled={!record} onClick={() => goToStep(value)}>
              <span>{String(index + 1).padStart(2, "0")}</span><strong>{label}</strong>
            </button>)}
        </nav>

        {(error || message) && <div className={`generator-message${error ? " generator-message--error" : ""}`} role={error ? "alert" : "status"}>{error || message}</div>}
        {newLink && <section className="generator-magic" aria-label="Link edit klien baru">
          <div><strong>Link edit pribadi</strong><span>Kirim hanya lewat WhatsApp ke pemilik. Link lama tidak berlaku setelah diganti.</span></div>
          <input aria-label="Tautan editor klien" value={newLink} readOnly onFocus={(event) => event.target.select()} />
          <button type="button" onClick={() => { void navigator.clipboard.writeText(newLink).then(() => setMessage("Link editor berhasil disalin.")).catch(() => setError("Salin tautan dari kolom di atas.")); }}>Salin link</button>
        </section>}

        {step === "data" && <section className="generator-step-panel" aria-label="Langkah satu: data">
          <div className="generator-step-heading"><span>LANGKAH 01 / 03</span><h2>Kenalan dulu.</h2><p>Masukkan identitas, riwayat, keahlian, karya, dan produk.</p></div>
          {session.role === "admin" && <section className="generator-manager">
            <details className="generator-manager__new"><summary><span>+ Buat klien baru</span><small>ISI BRIEF</small></summary>
              <div className="generator-manager__form">
                <label>Slug website <input placeholder="nama-klien" value={slugInput} onChange={(event) => setSlugInput(event.target.value.toLowerCase())} /></label>
                <label>Nama klien <input placeholder="Nama lengkap" value={nameInput} onChange={(event) => setNameInput(event.target.value)} /></label>
                <label>Tempel brief klien <textarea placeholder={"Nama: ...\nProfesi: ...\nWhatsApp: ...\nSkill: ...\nKarir: ..."} rows={5} value={brief} onChange={(event) => setBrief(event.target.value)} /></label>
                <p>Bagian yang berlabel akan otomatis dimasukkan ke formulir.</p>
                <label>Hak publish
                  <select value={policyInput} onChange={(event) => setPolicyInput(event.target.value as Policy)}>
                    <option value="approval">Butuh persetujuan admin</option>
                    <option value="self">Klien boleh publish sendiri</option>
                  </select>
                </label>
                <button type="button" className="generator-primary" disabled={working} onClick={create}>Buat website &amp; magic link</button>
              </div>
            </details>
            <label className="generator-client-select">Pilih website
              <select value={record?.slug || ""} onChange={(event) => { if (!dirty || window.confirm("Perubahan yang belum disimpan akan hilang. Lanjut?")) void openSite(event.target.value); }}>
                {!record && <option value="">Pilih website</option>}
                {clients.map((item) => <option value={item.slug} key={item.slug}>/{item.slug}{item.pendingRevision !== null ? " • menunggu persetujuan" : ""}</option>)}
              </select>
            </label>
          </section>}

          {record && draft && <>
            <section className="generator-client-status">
              <div><span className="generator-eyebrow">WEBSITE AKTIF</span><strong>/{record.slug}</strong></div>
              <span className={`generator-chip${record.pendingRevision !== null ? " generator-chip--pending" : ""}`}>{record.pendingRevision !== null ? "Menunggu admin" : dirty ? "Belum disimpan" : record.publishedRevision === record.revision ? "Sudah terbit" : "Draft"}</span>
              {session.role === "admin" && <>
                <label>Aturan publish <select value={record.policy} onChange={(event) => void setPolicy(event.target.value as Policy)} disabled={working}>
                  <option value="approval">Persetujuan admin</option><option value="self">Langsung publish</option>
                </select></label>
                <button type="button" onClick={rotate} disabled={working}>Buat ulang link edit</button>
                {record.pendingRevision !== null && <div className="generator-review">
                  <p>Revisi #{record.pendingRevision} menunggu keputusan admin.</p>
                  <button type="button" disabled={working} onClick={() => review("approve")}>Setujui &amp; terbitkan</button>
                  <button type="button" disabled={working} onClick={() => review("reject")}>Tolak revisi</button>
                </div>}
              </>}
            </section>
            <div className="generator-editor"><OriginalStudioEditor key={`${record.slug}-data`} mode="data" site={draft} change={change} /></div>
          </>}
          {!record && <div className="generator-empty"><strong>Belum ada website</strong><p>Buat website klien pertama, lalu lengkapi datanya.</p></div>}
        </section>}

        {step === "media" && draft && <section className="generator-step-panel" aria-label="Langkah dua: media">
          <div className="generator-step-heading"><span>LANGKAH 02 / 03</span><h2>Beri wajah.</h2><p>Pasang video latar dan foto untuk kartu Karya serta Produk. Gunakan link langsung dari Dropbox.</p></div>
          <div className="generator-editor"><OriginalStudioEditor key={`${record?.slug}-media`} mode="media" site={draft} change={change} /></div>
        </section>}

        {step === "preview" && draft && <section className="generator-step-panel" aria-label="Langkah tiga: pratinjau dan publikasi">
          <div className="generator-step-heading"><span>LANGKAH 03 / 03</span><h2>Lihat hasilnya.</h2><p>Periksa tampilan HP dan PC. Jika sudah cocok, simpan dan terbitkan.</p></div>
          <section className="generator-preview" aria-label="Pratinjau website">
            <div className="generator-preview__head">
              <strong>Pratinjau /{record?.slug}</strong>
              <div className="generator-device" role="group" aria-label="Ukuran layar pratinjau">
                <button type="button" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>HP</button>
                <button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>PC</button>
              </div>
            </div>
            <div className={`generator-canvas generator-canvas--${device}`} ref={canvasRef}>
              <div className="generator-frame-wrap" style={{ width: (device === "mobile" ? 390 : 1200) * scale, height: (device === "mobile" ? 844 : 780) * scale }}>
                <iframe ref={previewRef} title={`Pratinjau ${record?.slug || "klien"}`} src="/generator-preview/" className="generator-iframe"
                  style={{ width: device === "mobile" ? 390 : 1200, height: device === "mobile" ? 844 : 780, transform: `scale(${scale})` }} />
              </div>
            </div>
          </section>
          <div className="generator-final-actions">
            <div><strong>Siap dibagikan?</strong><p>{dirty ? "Ada perubahan baru. Simpan draft sebelum publish atau mengunduh HTML." : record?.policy === "approval" && session.role === "client" ? "Publikasi membutuhkan persetujuan admin." : "Draft yang sudah disimpan bisa langsung dipublikasikan."}</p></div>
            <button type="button" disabled={working || dirty} onClick={download}>Unduh HTML</button>
            <button type="button" className="generator-primary" disabled={working || dirty} onClick={publish}>{record?.policy === "approval" && session.role === "client" ? "Ajukan publish" : "Publish sekarang"}</button>
            {record && <a href={`/${record.slug}/`} target="_blank" rel="noreferrer">Lihat website publik ↗</a>}
          </div>
        </section>}

        {record && <footer className="generator-step-footer">
          <div className="generator-step-footer__save"><button type="button" disabled={working || !draft} onClick={save}>{working ? "Memproses…" : "Simpan draft"}</button><small>{dirty ? "Perubahan belum tersimpan" : "Draft tersimpan"}</small></div>
          <div className="generator-step-footer__nav">
            {step !== "data" && <button type="button" onClick={() => goToStep(step === "preview" ? "media" : "data")}>Kembali</button>}
            {step !== "preview" && <button type="button" className="generator-primary" onClick={() => goToStep(step === "data" ? "media" : "preview")}>Lanjut <span aria-hidden="true">→</span></button>}
          </div>
        </footer>}
      </div>
    </>}
  </main>;
}
