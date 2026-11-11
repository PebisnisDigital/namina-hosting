import { useCallback, useEffect, useState } from "react";
import { briefStatusLabel, type BriefRecord, type BriefStatus, type BriefSummary, type ClientBrief } from "../domain/brief";
import "../studio-briefs.css";

async function briefApi<T>(action: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/studio?action=${action}`, {
    credentials: "same-origin",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(result.error || "Tidak bisa menghubungi Studio.");
  return result as T;
}

const details: Array<{ key: keyof ClientBrief; label: string }> = [
  { key: "fullName", label: "Nama lengkap" },
  { key: "displayName", label: "Nama tampil" },
  { key: "profession", label: "Profesi" },
  { key: "brand", label: "Usaha / komunitas" },
  { key: "birthPlace", label: "Tempat lahir (privat)" },
  { key: "birthDate", label: "Tanggal lahir (privat)" },
  { key: "city", label: "Domisili" },
  { key: "address", label: "Alamat (privat)" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Email" },
  { key: "bio", label: "Perkenalan" },
  { key: "education", label: "Pendidikan" },
  { key: "skills", label: "Keahlian" },
  { key: "experience", label: "Pengalaman" },
  { key: "achievements", label: "Pencapaian" },
  { key: "certificates", label: "Sertifikasi" },
  { key: "hobbies", label: "Hobi" },
  { key: "services", label: "Layanan" },
  { key: "products", label: "Produk" },
  { key: "audience", label: "Target pelanggan" },
  { key: "portfolio", label: "Portofolio" },
  { key: "testimonials", label: "Testimoni" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "website", label: "Website" },
  { key: "photoUrl", label: "Foto referensi" },
  { key: "videoUrl", label: "Video referensi" },
  { key: "headline", label: "Tagline" },
  { key: "preferredStyle", label: "Nuansa visual" },
  { key: "characterNotes", label: "Outfit & ekspresi" },
  { key: "specialRequest", label: "Permintaan khusus" },
  { key: "requestedSlug", label: "Slug diminta" },
];
const linkKeys = new Set(["instagram", "facebook", "tiktok", "youtube", "linkedin", "website", "photoUrl", "videoUrl"]);

export function BriefInbox({ onPrepare }: { onPrepare: (brief: BriefRecord, slug: string) => boolean }) {
  const [items, setItems] = useState<BriefSummary[]>([]);
  const [selected, setSelected] = useState<BriefRecord | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [websiteSlug, setWebsiteSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const result = await briefApi<{ briefs: BriefSummary[] }>("briefList");
      setItems(result.briefs);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal memuat formulir.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const open = async (id: string) => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const response = await briefApi<{ brief: BriefRecord }>(`briefDetail&id=${encodeURIComponent(id)}`);
      setSelected(response.brief);
      setWebsiteSlug(response.brief.website_slug || response.brief.requested_slug || "");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const update = async (status: BriefStatus) => {
    if (!selected) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await briefApi<{ brief: { status: BriefStatus; website_slug: string | null } }>("briefUpdate", {
        method: "POST",
        body: JSON.stringify({ id: selected.id, status, websiteSlug: websiteSlug.trim() }),
      });
      setSelected({ ...selected, status: response.brief.status, website_slug: response.brief.website_slug });
      setItems((current) => current.map((item) => item.id === selected.id
        ? { ...item, status: response.brief.status, website_slug: response.brief.website_slug }
        : item));
      setNotice(status === "completed" ? "Website ditandai selesai." : "Status formulir sudah diperbarui.");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const prepare = async () => {
    if (!selected) return;
    if (!onPrepare(selected, websiteSlug.trim())) return;
    setBusy(true);
    setError("");
    try {
      await briefApi("briefUpdate", {
        method: "POST",
        body: JSON.stringify({ id: selected.id, status: "in_progress", websiteSlug: websiteSlug.trim() }),
      });
      setSelected({ ...selected, status: "in_progress", website_slug: websiteSlug.trim() || null });
      setItems((current) => current.map((item) => item.id === selected.id
        ? { ...item, status: "in_progress", website_slug: websiteSlug.trim() || null }
        : item));
      setNotice("Draft disiapkan di editor bawah. Lengkapi kartu, lalu publikasikan.");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const shown = items.filter((item) => filter === "all" || item.status !== "completed");
  const pending = items.filter((item) => item.status === "pending").length;

  return (
    <details className="brief-inbox" open>
      <summary className="brief-inbox__summary">
        <span>
          <strong>Formulir klien masuk</strong>
          <small>{pending} belum dibuatkan website</small>
        </span>
        <span className="brief-inbox__summary-note">Buka / tutup antrean</span>
      </summary>
      <div className="brief-inbox__main">
        <div className="brief-inbox__toolbar">
          <p>Brief baru masuk lewat <a href="/formulir" target="_blank" rel="noreferrer">/formulir</a>. Hanya tim admin yang bisa membaca isinya.</p>
          <div>
            <label htmlFor="brief-filter">Tampilkan</label>
            <select id="brief-filter" value={filter} onChange={(event) => setFilter(event.target.value as "pending" | "all")}>
              <option value="pending">Belum selesai</option>
              <option value="all">Semua formulir</option>
            </select>
            <button type="button" onClick={() => void refresh()} disabled={loading}>Muat ulang</button>
          </div>
        </div>
        {error && <p role="alert" className="brief-inbox__error">{error}</p>}
        {notice && <p role="status" className="brief-inbox__notice">{notice}</p>}
        <div className="brief-inbox__columns">
          <div className="brief-inbox__list" aria-label="Daftar klien">
            {loading && <p role="status">Memuat formulir klien…</p>}
            {!loading && shown.length === 0 && (
              <div className="brief-inbox__empty">
                <strong>Belum ada formulir pada daftar ini.</strong>
                <p>Bagikan link /formulir kepada klien. Setelah mereka mengirim biodata, datanya akan tampil di sini.</p>
              </div>
            )}
            {!loading && shown.map((item) => (
              <button type="button" key={item.id} className={`brief-inbox__item${selected?.id === item.id ? " is-active" : ""}`}
                onClick={() => void open(item.id)} aria-pressed={selected?.id === item.id}>
                <span className="brief-inbox__name">{item.full_name}</span>
                <span className="brief-inbox__profession">{item.profession}</span>
                <span className="brief-inbox__meta">{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} · {briefStatusLabel[item.status]}</span>
              </button>
            ))}
          </div>
          <div className="brief-inbox__detail">
            {!selected && <div className="brief-inbox__empty"><strong>Pilih satu nama klien.</strong><p>Seluruh biodata akan tampil di sini agar tim bisa menyiapkan prompt foto, prompt video, dan website.</p></div>}
            {busy && <p role="status" className="brief-inbox__busy">Sedang memproses…</p>}
            {selected && (
              <>
                <div className="brief-inbox__detail-head">
                  <p>Brief #{selected.id.slice(0, 8).toUpperCase()}</p>
                  <h2>{selected.full_name}</h2>
                  <span>{briefStatusLabel[selected.status]}</span>
                </div>
                <div className="brief-inbox__actions">
                  <label htmlFor="brief-site-slug">Slug website</label>
                  <input id="brief-site-slug" value={websiteSlug} onChange={(event) => setWebsiteSlug(event.target.value.toLowerCase())} placeholder="nama-klien" />
                  <button type="button" onClick={() => void prepare()} disabled={busy}>Siapkan draft</button>
                  <button type="button" onClick={() => void update("in_progress")} disabled={busy}>Sedang dikerjakan</button>
                  <button type="button" onClick={() => void update("completed")} disabled={busy}>Tandai selesai</button>
                  {selected.website_slug && <a href={`/${selected.website_slug}`} target="_blank" rel="noreferrer">Buka websitenya</a>}
                </div>
                <p className="brief-inbox__privacy">Untuk internal: tempat/tanggal lahir dan alamat tidak boleh dimasukkan ke halaman publik tanpa persetujuan klien.</p>
                <dl className="brief-inbox__data">
                  {details.map(({ key, label }) => {
                    const value = selected.details[key];
                    if (typeof value !== "string" || !value.trim()) return null;
                    return (
                      <div key={key}>
                        <dt>{label}</dt>
                        <dd>{linkKeys.has(key) ? <a href={value} target="_blank" rel="noopener noreferrer">{value}</a> : value}</dd>
                      </div>
                    );
                  })}
                </dl>
              </>
            )}
          </div>
        </div>
      </div>
    </details>
  );
}
