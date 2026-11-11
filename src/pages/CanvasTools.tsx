import type { Selection } from "../domain/content";
import type { SiteDocument } from "../static/sites";

export type CanvasMediaTarget = "portrait" | "poster" | "enterKey" | `card:${string}`;
export type CardCommand = "add" | "duplicate" | "delete" | "up" | "down" | "hide";

type Props = {
  document: SiteDocument;
  selection: Selection;
  selectedCardId: string;
  uploading: boolean;
  onChange: (update: (draft: SiteDocument) => void) => void;
  onUpload: (target: CanvasMediaTarget, file: File) => void;
  onCardCommand: (command: CardCommand) => void;
  onClose: () => void;
};

function TextControl({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (next: string) => void; multiline?: boolean }) {
  return <label className="studio-canvas-tools__field">{label}{multiline
    ? <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} />
    : <input value={value} onChange={(event) => onChange(event.target.value)} />}</label>;
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }) {
  return <label className="studio-canvas-tools__color">{label}<input type="color" value={value} onChange={(event) => onChange(event.target.value)} /><small>{value}</small></label>;
}

function ScaleControl({ label, value, onChange }: { label: string; value: number; onChange: (next: number) => void }) {
  return <label className="studio-canvas-tools__field">{label} ({Math.round(value * 100)}%)
    <input type="range" min="75" max="140" step="5" value={Math.round(value * 100)} onChange={(event) => onChange(Number(event.target.value) / 100)} />
  </label>;
}

function ImageControl({ label, value, disabled, onChange, onUpload }: {
  label: string; value: string; disabled: boolean;
  onChange: (next: string) => void; onUpload: (file: File) => void;
}) {
  return <div className="studio-canvas-tools__media">
    <TextControl label={`${label} (URL HTTPS)`} value={value} onChange={onChange} />
    <label className="studio-canvas-tools__upload">Unggah {label.toLowerCase()}
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        if (file) onUpload(file);
        event.currentTarget.value = "";
      }} />
    </label>
  </div>;
}

export function CanvasTools({ document, selection, selectedCardId, uploading, onChange, onUpload, onCardCommand, onClose }: Props) {
  const card = document.content.cards.find((item) => item.id === selectedCardId);
  const label = selection.startsWith("card:") ? `Kartu: ${card?.title || "Tidak ditemukan"}` : ({
    identity: "Teks & foto",
    background: "Video & latar",
    theme: "Tema & tombol ENTER",
    wallet: "Material kartu",
  } as Record<Exclude<Selection, `card:${string}`>, string>)[selection as Exclude<Selection, `card:${string}`>];

  return <aside className="studio-canvas-tools" aria-label={`Edit langsung: ${label}`}>
    <div className="studio-canvas-tools__heading">
      <div><strong>{label}</strong><small>Perubahan langsung terlihat di kanvas</small></div>
      <button type="button" aria-label="Tutup editor kanvas" onClick={onClose}>Tutup</button>
    </div>
    <div className="studio-canvas-tools__content">
      {selection === "identity" && <>
        <p className="studio-canvas-tools__tip">Klik teks di preview untuk mengetik langsung di posisinya.</p>
        <TextControl label="Nama" value={document.content.identity.displayName} onChange={(value) => onChange((d) => { d.content.identity.displayName = value; })} />
        <TextControl label="Profesi" value={document.content.identity.profession} onChange={(value) => onChange((d) => { d.content.identity.profession = value; })} />
        <TextControl label="Sapaan" value={document.content.identity.introLabel ?? "Hello, kenalain saya"} onChange={(value) => onChange((d) => { d.content.identity.introLabel = value; })} />
        <TextControl label="Teks merek di pojok" value={document.content.identity.brandLabel ?? "NAMINA"} onChange={(value) => onChange((d) => { d.content.identity.brandLabel = value; })} />
        <TextControl label="Bio pada halaman pembuka" multiline value={document.content.identity.bio} onChange={(value) => onChange((d) => { d.content.identity.bio = value; })} />
        <ImageControl label="Foto profil" value={document.media.portrait} disabled={uploading} onChange={(value) => onChange((d) => { d.media.portrait = value; })} onUpload={(file) => onUpload("portrait", file)} />
      </>}

      {selection === "theme" && <>
        <ImageControl label="Gambar tombol ENTER" value={document.media.enterKey || ""} disabled={uploading} onChange={(value) => onChange((d) => { d.media.enterKey = value; })} onUpload={(file) => onUpload("enterKey", file)} />
        <ColorControl label="Warna aksen" value={document.content.theme.accent} onChange={(value) => onChange((d) => { d.content.theme.accent = value; })} />
        <ColorControl label="Warna nama" value={document.content.theme.titleColor || "#f8f3e8"} onChange={(value) => onChange((d) => { d.content.theme.titleColor = value; })} />
        <ColorControl label="Warna profesi" value={document.content.theme.roleColor || "#d8ad67"} onChange={(value) => onChange((d) => { d.content.theme.roleColor = value; })} />
        <label className="studio-canvas-tools__field">Jenis font
          <select value={document.content.theme.fontPreset} onChange={(event) => onChange((d) => { d.content.theme.fontPreset = event.target.value as "original" | "system"; })}>
            <option value="original">ORIGINAL</option><option value="system">Font sistem</option>
          </select>
        </label>
        <ScaleControl label="Ukuran nama & profesi" value={document.content.theme.headingScale || 1} onChange={(value) => onChange((d) => { d.content.theme.headingScale = Math.min(1.3, Math.max(.8, value)); })} />
        <ScaleControl label="Ukuran judul kartu" value={document.content.theme.cardTitleScale || 1} onChange={(value) => onChange((d) => { d.content.theme.cardTitleScale = value; })} />
        <ScaleControl label="Ukuran subjudul kartu" value={document.content.theme.cardValueScale || 1} onChange={(value) => onChange((d) => { d.content.theme.cardValueScale = value; })} />
        <ScaleControl label="Ukuran isi kartu" value={document.content.theme.cardBodyScale || 1} onChange={(value) => onChange((d) => { d.content.theme.cardBodyScale = value; })} />
      </>}

      {selection === "background" && <>
        <TextControl label="URL video desktop (MP4)" value={document.media.desktopVideo} onChange={(value) => onChange((d) => { d.media.desktopVideo = value; })} />
        <TextControl label="URL video HP (MP4)" value={document.media.mobileVideo} onChange={(value) => onChange((d) => { d.media.mobileVideo = value; })} />
        <p className="studio-canvas-tools__tip">Gunakan tautan HTTPS langsung ke MP4. Video Dropbox dapat memakai parameter raw=1.</p>
        <ImageControl label="Poster video" value={document.media.poster} disabled={uploading} onChange={(value) => onChange((d) => { d.media.poster = value; })} onUpload={(file) => onUpload("poster", file)} />
        <label className="studio-canvas-tools__field">Kegelapan ({Math.round(document.content.background.overlayOpacity * 100)}%)
          <input type="range" min="25" max="85" value={Math.round(document.content.background.overlayOpacity * 100)} onChange={(event) => onChange((d) => { d.content.background.overlayOpacity = Number(event.target.value) / 100; })} />
        </label>
        <label className="studio-canvas-tools__field">Fokus horizontal ({document.content.background.focalX}%)
          <input type="range" min="0" max="100" value={document.content.background.focalX} onChange={(event) => onChange((d) => { d.content.background.focalX = Number(event.target.value); })} />
        </label>
        <label className="studio-canvas-tools__field">Fokus vertikal ({document.content.background.focalY}%)
          <input type="range" min="0" max="100" value={document.content.background.focalY} onChange={(event) => onChange((d) => { d.content.background.focalY = Number(event.target.value); })} />
        </label>
      </>}

      {selection === "wallet" && <>
        <ColorControl label="Warna material" value={document.content.wallet.color} onChange={(value) => onChange((d) => { d.content.wallet.color = value; })} />
      </>}

      {selection.startsWith("card:") && card && <>
        <p className="studio-canvas-tools__tip">Klik judul, subjudul, atau cerita pada kartu untuk mengetik langsung.</p>
        <TextControl label="Judul" value={card.title} onChange={(value) => onChange((d) => { d.content.cards.find((item) => item.id === card.id)!.title = value; })} />
        <TextControl label="Subjudul" value={card.subtitle} onChange={(value) => onChange((d) => { d.content.cards.find((item) => item.id === card.id)!.subtitle = value; })} />
        <TextControl label="Cerita" multiline value={card.description} onChange={(value) => onChange((d) => { d.content.cards.find((item) => item.id === card.id)!.description = value; })} />
        <TextControl label="Tautan / WhatsApp" value={card.link} onChange={(value) => onChange((d) => { d.content.cards.find((item) => item.id === card.id)!.link = value; })} />
        <TextControl label="Tulisan tombol tautan" value={card.linkLabel || ""} onChange={(value) => onChange((d) => { d.content.cards.find((item) => item.id === card.id)!.linkLabel = value; })} />
        <ImageControl label="Gambar / ikon kartu" value={document.media.cards[card.id] || ""} disabled={uploading} onChange={(value) => onChange((d) => { d.media.cards[card.id] = value; })} onUpload={(file) => onUpload(`card:${card.id}`, file)} />
        <ColorControl label="Warna kartu" value={card.color} onChange={(value) => onChange((d) => { d.content.cards.find((item) => item.id === card.id)!.color = value; })} />
        <div className="studio-canvas-tools__actions">
          <button type="button" onClick={() => onCardCommand("up")}>Naikkan</button>
          <button type="button" onClick={() => onCardCommand("down")}>Turunkan</button>
          <button type="button" onClick={() => onCardCommand("duplicate")} disabled={document.content.cards.length >= 24}>Duplikat</button>
          <button type="button" onClick={() => onCardCommand("hide")}>{card.visible ? "Sembunyikan" : "Tampilkan"}</button>
          <button type="button" className="studio-canvas-tools__danger" onClick={() => onCardCommand("delete")} disabled={document.content.cards.length === 1}>Hapus kartu</button>
        </div>
      </>}
      {uploading && <p role="status" className="studio-canvas-tools__tip">Mengunggah gambar ke penyimpanan website…</p>}
    </div>
  </aside>;
}
