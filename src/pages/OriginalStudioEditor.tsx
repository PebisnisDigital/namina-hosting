import { useState } from "react";
import type { OriginalStyle } from "../domain/content";
import type { SiteDocument } from "../static/sites";
import { originalStyleDefaults } from "../static/originalStyle";
import { OriginalStyleEditor } from "./OriginalStyleEditor";
import { buildClientImagePrompt, buildClientVideoPrompt, hasClientPromptContext, whatsAppLinkFromNumber, whatsAppNumberFromLink } from "../static/generatorPrompts";

type SectionKey = "nama" | "karir" | "skill";
type GalleryKey = "karya" | "produk";
type EditProps = {
  site: SiteDocument;
  change: (update: (next: SiteDocument) => void) => void;
  mode?: "all" | "data" | "media";
  onUpload?: (id: string, file: File) => void;
  uploading?: boolean;
  previews?: Record<string, string>;
};

const icons = [
  [8121295, "Profil"], [8121312, "Kalender"], [8121270, "Lokasi"],
  [8121302, "Rumah"], [8121279, "Aktivitas"], [8121297, "Olahraga"],
  [8121313, "Pendidikan"], [8121304, "Karir"], [8121299, "Profesi"], [8121309, "Website"],
  [8121272, "Kreatif"], [8121262, "Digital"], [8121290, "Teknologi"],
] as const;

function TextField({ label, value, onChange, placeholder, multiline = false, maxLength }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
}) {
  return <label className="studio-original__field">
    <span>{label}</span>
    {multiline ? <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} />
      : <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} />}
  </label>;
}

type EditorTab = "dasar" | "video" | "prompt-gambar" | "prompt-video" | "tampilan" | SectionKey | GalleryKey;

export function OriginalStudioEditor({ site, change, mode = "all", onUpload, uploading = false, previews = {} }: EditProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>(mode === "media" ? "video" : "dasar");
  const [selectedGallery, setSelectedGallery] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"ready" | "copied" | "error">("ready");
  const original = site.content.original!;
  const menuLabel = (section: SectionKey | GalleryKey) => original[section].title?.trim() || ({ nama: "Nama", karir: "Karir", skill: "Skill", karya: "Karya", produk: "Produk" } as const)[section];
  const style = { ...originalStyleDefaults, ...original.style };
  const updateStyle = <K extends keyof OriginalStyle>(field: K, value: OriginalStyle[K]) => {
    change((next) => { next.content.original!.style = { ...originalStyleDefaults, ...next.content.original!.style, [field]: value }; });
  };
  const updateSection = (section: SectionKey | GalleryKey, field: "intro" | "subtitle" | "description", value: string) => {
    change((next) => { next.content.original![section][field] = value; });
  };
  const updateMenuTitle = (section: SectionKey | GalleryKey, value: string) => {
    change((next) => { next.content.original![section].title = value; });
  };
  const updateFact = (section: SectionKey, id: string, field: "label" | "value" | "icon", value: string | number) => {
    change((next) => {
      const fact = next.content.original![section].items.find((item) => item.id === id);
      if (!fact) return;
      if (field === "icon") fact.icon = Number(value);
      else fact[field] = String(value);
    });
  };
  const addFact = (section: SectionKey) => {
    change((next) => {
      next.content.original![section].items.push({
        id: crypto.randomUUID(),
        label: section === "nama" ? "Data" : section === "karir" ? "Karir" : "Skill",
        value: "",
        icon: section === "nama" ? 8121295 : section === "karir" ? 8121304 : 8121272,
      });
    });
  };
  const addGallery = (section: GalleryKey) => {
    const id = crypto.randomUUID();
    change((next) => {
      next.content.original![section].items.push({
        id, title: section === "karya" ? "Karya baru" : "Produk baru",
        description: "", link: "", imageAssetId: null, color: "#ee4851", motif: "cinema",
      });
    });
    setSelectedGallery(id);
  };
  const updateGallery = (section: GalleryKey, id: string, field: "title" | "description" | "link" | "color", value: string) => {
    change((next) => {
      const item = next.content.original![section].items.find((entry) => entry.id === id);
      if (item) item[field] = value;
    });
  };
  const removeGallery = (section: GalleryKey, id: string) => change((next) => {
    next.content.original![section].items = next.content.original![section].items.filter((item) => item.id !== id);
    delete next.media.cards[id];
  });
  const availableTabs: readonly (readonly [EditorTab, string])[] = mode === "data"
    ? [["dasar", "Identitas"], ["nama", menuLabel("nama")], ["karir", menuLabel("karir")], ["skill", menuLabel("skill")], ["karya", menuLabel("karya")], ["produk", menuLabel("produk")]]
    : mode === "media"
      ? [["video", "Video"], ["prompt-gambar", "Prompt Gambar"], ["prompt-video", "Prompt Video"], ["tampilan", "Warna & gaya"]]
      : [["dasar", "Dasar"], ["nama", menuLabel("nama")], ["karir", menuLabel("karir")], ["skill", menuLabel("skill")], ["karya", menuLabel("karya")], ["produk", menuLabel("produk")], ["tampilan", "Tampilan"]];

  return <div className="studio-original">
    <nav className="studio-original__tabs" aria-label="Pilih menu untuk diedit">
      {availableTabs.map(([key, label]) =>
        <button type="button" key={key} className={activeTab === key ? "is-active" : ""}
          aria-pressed={activeTab === key}
          onClick={() => { setActiveTab(key); setSelectedGallery(null); setCopyStatus("ready"); }}>{label}</button>)}
    </nav>
    {activeTab === "dasar" && <>
    <div className="studio-original__heading"><h2>{mode === "data" ? "Profil utama" : "Identitas dan video"}</h2><span>Template Original</span></div>
    <section className="studio-group">
      <div className="studio-original__fields-2"><TextField label="Nama di judul" maxLength={60} value={site.content.identity.displayName} onChange={(value) => change((next) => {
        const previous = next.content.identity.displayName;
        next.content.identity.displayName = value;
        const first = next.content.original!.nama.items.find((item) => item.label === "Nama" && item.value === previous);
        if (first) first.value = value;
      })} />
      <TextField label="Profesi atau tagline" maxLength={70} value={site.content.identity.profession} onChange={(value) => change((next) => { next.content.identity.profession = value; })} /></div>
      <label className="studio-original__field">
        <span>Nomor WhatsApp untuk tombol Japri Saya!</span>
        <input type="tel" inputMode="tel" autoComplete="tel" value={whatsAppNumberFromLink(original.contactUrl)} placeholder="0812 3456 7890"
          onChange={(event) => change((next) => { next.content.original!.contactUrl = whatsAppLinkFromNumber(event.target.value, next.content.original!.contactUrl); })} />
      </label>
      <p className="generator-editor-hint">Isi nomor saja. Tombol Japri Saya! tetap membuka chat WhatsApp.</p>
    </section>
    {mode === "all" && <section className="studio-group">
      <h3>Video latar</h3>
      <TextField label="Video desktop (URL HTTPS)" value={site.media.desktopVideo} placeholder="https://.../video.mp4" onChange={(value) => change((next) => { next.media.desktopVideo = value; })} />
      <TextField label="Video mobile (opsional)" value={site.media.mobileVideo} placeholder="Kosong = video desktop" onChange={(value) => change((next) => { next.media.mobileVideo = value; })} />
      <label className="studio-original__field"><span>Posisi video desktop kiri-kanan: {site.content.background.focalX}%</span>
        <input type="range" min={0} max={100} value={site.content.background.focalX} onChange={(event) => change((next) => { next.content.background.focalX = Number(event.target.value); })} />
      </label>
      <label className="studio-original__field"><span>Posisi model di HP: {site.content.background.mobileFocalX ?? site.content.background.focalX}%</span>
        <input type="range" min={0} max={100} value={site.content.background.mobileFocalX ?? site.content.background.focalX} onChange={(event) => change((next) => { next.content.background.mobileFocalX = Number(event.target.value); })} />
      </label>
    </section>}
    </>}

    {activeTab === "video" && mode === "media" && <section className="studio-group">
      <div className="studio-original__heading"><h2>Video latar sinematik</h2><span>Link Dropbox</span></div>
      <p className="generator-editor-hint">Tempel tautan video yang bisa diputar langsung. Pastikan akses Dropbox diatur untuk siapa saja yang memiliki tautan.</p>
      <TextField label="Video desktop (URL HTTPS)" value={site.media.desktopVideo} placeholder="https://.../video.mp4" onChange={(value) => change((next) => { next.media.desktopVideo = value; })} />
      <TextField label="Video HP (opsional)" value={site.media.mobileVideo} placeholder="Kosong = pakai video desktop" onChange={(value) => change((next) => { next.media.mobileVideo = value; })} />
      <label className="studio-original__field"><span>Posisi video desktop: {site.content.background.focalX}%</span>
        <input type="range" min={0} max={100} value={site.content.background.focalX} onChange={(event) => change((next) => { next.content.background.focalX = Number(event.target.value); })} />
      </label>
      <label className="studio-original__field"><span>Posisi model di HP: {site.content.background.mobileFocalX ?? site.content.background.focalX}%</span>
        <input type="range" min={0} max={100} value={site.content.background.mobileFocalX ?? site.content.background.focalX} onChange={(event) => change((next) => { next.content.background.mobileFocalX = Number(event.target.value); })} />
      </label>
    </section>}

    {(activeTab === "prompt-gambar" || activeTab === "prompt-video") && mode === "media" && (() => {
      const isImage = activeTab === "prompt-gambar";
      const prompt = isImage ? buildClientImagePrompt(site) : buildClientVideoPrompt(site);
      return <section className="studio-group studio-original__prompt">
        <div className="studio-original__heading"><h2>{isImage ? "Prompt Gambar" : "Prompt Video"}</h2><span>Otomatis dari data klien</span></div>
        <p className="generator-editor-hint">{isImage
          ? "Salin prompt ke Flow. Gunakan foto klien sebagai referensi pertama dan gambar gaya sinematik sebagai referensi kedua jika ada."
          : "Salin prompt ke Flow setelah gambar klien siap. Gunakan gambar itu sebagai referensi utama saat membuat video berjalan."}</p>
        {!hasClientPromptContext(site) && <p className="studio-original__prompt-warning" role="status">
          Nama atau profesi belum lengkap. Isi dulu pada tahap Isi Data agar prompt sesuai klien.
        </p>}
        <label className="studio-original__field">
          <span>{isImage ? "Teks prompt gambar" : "Teks prompt video"}</span>
          <textarea className="studio-original__prompt-text" readOnly rows={16} value={prompt} aria-label={isImage ? "Prompt gambar otomatis" : "Prompt video otomatis"} />
        </label>
        <div className="studio-original__prompt-actions">
          <p role="status">{copyStatus === "copied" ? "Prompt berhasil disalin." : copyStatus === "error" ? "Tidak bisa menyalin otomatis. Pilih dan salin teks prompt di atas." : "Prompt mengikuti data terbaru di tahap Isi Data."}</p>
          <button type="button" onClick={async () => {
            try { await navigator.clipboard.writeText(prompt); setCopyStatus("copied"); }
            catch { setCopyStatus("error"); }
          }}>Salin prompt</button>
        </div>
      </section>;
    })()}

    {activeTab === "tampilan" && <OriginalStyleEditor value={style} update={updateStyle} reset={() => change((next) => { delete next.content.original!.style; })} />}

    {(["nama", "karir", "skill"] as const).filter((section) => section === activeTab).map((section) => <section className="studio-group studio-original__chapter" key={section}>
      <div className="studio-original__heading"><h2>Menu {menuLabel(section)}</h2><span>{original[section].items.length} data</span></div>
      <div className="studio-original__copy">
      <TextField label="Nama menu di website" maxLength={40} value={original[section].title ?? menuLabel(section)} onChange={(value) => updateMenuTitle(section, value)} />
      <TextField label="Kalimat pembuka" maxLength={120} value={original[section].intro} onChange={(value) => updateSection(section, "intro", value)} />
      {section !== "nama" && <TextField label="Subjudul merah" maxLength={100} value={original[section].subtitle} onChange={(value) => updateSection(section, "subtitle", value)} />}
      <TextField label="Deskripsi di bawah judul" multiline maxLength={400} value={original[section].description} onChange={(value) => updateSection(section, "description", value)} />
      </div>
      <div className="studio-original__heading studio-original__subheading"><h3>Data slide</h3><span>Urutan animasi</span></div>
      {original[section].items.length === 0 && <p className="studio-hint">Belum ada data. Tambahkan baris pertama.</p>}
      {original[section].items.map((item, index) => <div className="studio-original__item studio-original__fact" key={item.id}>
        <span className="studio-original__row-index">{index + 1}</span>
        <TextField label="Label" maxLength={40} value={item.label} onChange={(value) => updateFact(section, item.id, "label", value)} />
        <TextField label="Isi" maxLength={180} value={item.value} onChange={(value) => updateFact(section, item.id, "value", value)} />
        <label className="studio-original__field"><span>Ikon</span><select value={item.icon} onChange={(event) => updateFact(section, item.id, "icon", Number(event.target.value))}>
          {icons.map(([id, label]) => <option value={id} key={id}>{label}</option>)}
        </select></label>
        <button type="button" className="studio-original__remove" aria-label={`Hapus data ${index + 1}`} title={`Hapus data ${index + 1}`} onClick={() => change((next) => { next.content.original![section].items = next.content.original![section].items.filter((fact) => fact.id !== item.id); })}>×</button>
      </div>)}
      <button type="button" className="studio-original__add" disabled={original[section].items.length >= 30} onClick={() => addFact(section)}>+ Tambah data</button>
    </section>)}

    {(["karya", "produk"] as const).filter((section) => section === activeTab).map((section) => <section className="studio-group studio-original__chapter" key={section}>
      <div className="studio-original__heading"><h2>Menu {menuLabel(section)}</h2><span>{original[section].items.length} kartu</span></div>
      {mode !== "media" && <div className="studio-original__copy">
      <TextField label="Nama menu di website" maxLength={40} value={original[section].title ?? menuLabel(section)} onChange={(value) => updateMenuTitle(section, value)} />
      <TextField label="Kalimat pembuka" maxLength={120} value={original[section].intro} onChange={(value) => updateSection(section, "intro", value)} />
      <TextField label="Subjudul merah" maxLength={100} value={original[section].subtitle} onChange={(value) => updateSection(section, "subtitle", value)} />
      <TextField label="Deskripsi" multiline maxLength={400} value={original[section].description} onChange={(value) => updateSection(section, "description", value)} />
      </div>}
      <div className="studio-original__heading studio-original__subheading"><h3>{mode === "media" ? `Gambar ${section}` : `Galeri ${section}`}</h3><span>{original[section].items.length} kartu</span></div>
      {original[section].items.length === 0 && <p className="studio-hint">{mode === "media" ? "Belum ada kartu. Tambahkan dulu pada langkah Data." : "Belum ada kartu. Tambahkan kartu pertama."}</p>}
      <div className="studio-original__gallery-list" aria-label={`Daftar ${section}`}>
        {original[section].items.map((item, index) => <button key={item.id} type="button" aria-pressed={(selectedGallery || original[section].items[0]?.id) === item.id}
          className={`studio-original__gallery-choice${(selectedGallery || original[section].items[0]?.id) === item.id ? " is-active" : ""}`}
          onClick={() => setSelectedGallery(item.id)}>{index + 1}. {item.title}</button>)}
      </div>
      {original[section].items.filter((item) => item.id === (selectedGallery && original[section].items.some((entry) => entry.id === selectedGallery) ? selectedGallery : original[section].items[0]?.id)).map((item) => {
        const url = site.media.cards[item.id] || "";
        return <div className="studio-original__item studio-original__gallery-edit" key={item.id}>
          <div className="studio-original__item-head"><strong>{item.title}</strong>{mode !== "media" && <button type="button" onClick={() => { removeGallery(section, item.id); setSelectedGallery(null); }}>Hapus kartu</button>}</div>
          {mode !== "media" && <>
            <TextField label="Judul" maxLength={80} value={item.title} onChange={(value) => updateGallery(section, item.id, "title", value)} />
            <TextField label="Detail popup" multiline maxLength={1200} value={item.description} onChange={(value) => updateGallery(section, item.id, "description", value)} />
            <TextField label="URL tombol pada popup" value={item.link} placeholder="https://contoh.com" onChange={(value) => updateGallery(section, item.id, "link", value)} />
          </>}
          <>
          <TextField label={"Link gambar " + section + " (URL HTTPS)"} value={url} placeholder="https://.../gambar.webp" onChange={(value) => change((next) => { next.media.cards[item.id] = value; })} />
          {url ? <img className="studio-original__image" src={previews[url] || url} alt={`Pratinjau ${item.title}`} width={570} height={180} loading="lazy" />
            : mode !== "data" && <p className="studio-original__no-image">Belum ada foto. Ilustrasi bawaan tampil sementara.</p>}
          {mode !== "data" && onUpload && <label className="studio-original__upload">Unggah foto JPG, PNG atau WebP (maksimal 1,3 MB)
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) onUpload(item.id, file);
              event.currentTarget.value = "";
            }} />
          </label>}
          </>
        </div>;
      })}
      {mode !== "media" && <button type="button" className="studio-original__add" disabled={original[section].items.length >= 20} onClick={() => addGallery(section)}>+ Tambah {section}</button>}
    </section>)}
  </div>;
}

