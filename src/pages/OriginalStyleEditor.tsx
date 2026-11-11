import type { OriginalStyle } from "../domain/content";

type StyleKey = keyof OriginalStyle;
type StyleProps = {
  value: OriginalStyle;
  update: <K extends StyleKey>(field: K, next: OriginalStyle[K]) => void;
  reset: () => void;
};

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }) {
  return <label className="studio-style__color">
    <span>{label}<small>{value.toUpperCase()}</small></span>
    <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
  </label>;
}

function Range({ label, value, min, max, step = 1, unit = "", onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (next: number) => void;
}) {
  return <label className="studio-style__range">
    <span>{label}<output>{Number.isInteger(value) ? value : value.toFixed(2)}{unit}</output></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
  </label>;
}

function luminance(hex: string) {
  const rgb = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

function contrast(a: string, b: string) {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export function OriginalStyleEditor({ value, update, reset }: StyleProps) {
  const textContrast = contrast(value.textColor, value.backgroundColor);
  const buttonContrast = value.buttonVariant === "solid" ? contrast(value.buttonTextColor, value.buttonColor) : textContrast;

  return <section className="studio-style">
    <div className="studio-original__heading">
      <h2>Tampilan website</h2>
      <button type="button" className="studio-style__reset" onClick={reset}>Reset Original</button>
    </div>
    <p className="studio-style__intro">Ubah gaya website ini. Preview di sebelah kanan mengikuti pengaturan sebelum dipublikasikan.</p>
    <details className="studio-style__group" open>
      <summary>Warna <span>Background, teks, aksen</span></summary>
      <div className="studio-style__colors">
        <ColorPicker label="Background" value={value.backgroundColor} onChange={(next) => update("backgroundColor", next)} />
        <ColorPicker label="Teks" value={value.textColor} onChange={(next) => update("textColor", next)} />
        <ColorPicker label="Aksen / judul" value={value.accentColor} onChange={(next) => update("accentColor", next)} />
        <ColorPicker label="Tombol" value={value.buttonColor} onChange={(next) => update("buttonColor", next)} />
        <ColorPicker label="Teks tombol" value={value.buttonTextColor} onChange={(next) => update("buttonTextColor", next)} />
        <ColorPicker label="Garis / border" value={value.borderColor} onChange={(next) => update("borderColor", next)} />
      </div>
      {(textContrast < 4.5 || buttonContrast < 4.5) && <p className="studio-style__warning" role="status">
        Kontras {textContrast < 4.5 ? "teks" : "tombol"} terlalu rendah. Pilih warna yang lebih berbeda agar mudah dibaca.
      </p>}
    </details>
    <details className="studio-style__group">
      <summary>Font <span>Jenis dan ukuran</span></summary>
      <div className="studio-style__group-content">
        <label className="studio-original__field"><span>Jenis font</span>
          <select value={value.fontFamily} onChange={(event) => update("fontFamily", event.target.value as OriginalStyle["fontFamily"])}>
            <option value="montserrat">Montserrat (Original)</option>
            <option value="space">Space Grotesk</option>
            <option value="georgia">Georgia</option>
            <option value="system">Font sistem</option>
          </select>
        </label>
        <Range label="Ukuran judul" value={value.titleScale} min={0.8} max={1.2} step={0.05} unit="×" onChange={(next) => update("titleScale", next)} />
        <Range label="Ukuran isi" value={value.bodyScale} min={0.85} max={1.2} step={0.05} unit="×" onChange={(next) => update("bodyScale", next)} />
      </div>
    </details>
    <details className="studio-style__group">
      <summary>Layout <span>Kolom, margin, jarak</span></summary>
      <div className="studio-style__group-content">
        <div className="studio-style__two">
          <label className="studio-original__field"><span>Kolom data (desktop)</span>
            <select value={value.factColumns} onChange={(event) => update("factColumns", Number(event.target.value))}>
              <option value={2}>2 kolom</option><option value={3}>3 kolom</option><option value={4}>4 kolom</option>
            </select>
          </label>
          <label className="studio-original__field"><span>Kolom gambar (desktop)</span>
            <select value={value.galleryColumns} onChange={(event) => update("galleryColumns", Number(event.target.value))}>
              <option value={1}>1 kolom</option><option value={2}>2 kolom</option><option value={3}>3 kolom</option>
            </select>
          </label>
        </div>
        <Range label="Margin kiri konten" value={value.contentMargin} min={40} max={150} step={5} unit="px" onChange={(next) => update("contentMargin", next)} />
        <Range label="Jarak atas konten" value={value.topSpacing} min={0} max={90} step={5} unit="px" onChange={(next) => update("topSpacing", next)} />
        <Range label="Jarak antar kartu" value={value.cardGap} min={0} max={28} step={2} unit="px" onChange={(next) => update("cardGap", next)} />
        <p className="studio-style__note">Pada layar HP, kartu tampil satu kolom agar tetap terbaca.</p>
      </div>
    </details>
    <details className="studio-style__group">
      <summary>Tombol & efek <span>Sudut, garis, shadow</span></summary>
      <div className="studio-style__group-content">
        <div className="studio-style__two">
          <label className="studio-original__field"><span>Gaya tombol</span>
            <select value={value.buttonVariant} onChange={(event) => update("buttonVariant", event.target.value as OriginalStyle["buttonVariant"])}>
              <option value="solid">Isi warna</option><option value="outline">Garis tepi</option>
            </select>
          </label>
          <label className="studio-original__field"><span>Shadow</span>
            <select value={value.shadow} onChange={(event) => update("shadow", event.target.value as OriginalStyle["shadow"])}>
              <option value="none">Tanpa shadow</option><option value="soft">Lembut</option><option value="strong">Tegas</option>
            </select>
          </label>
        </div>
        <Range label="Sudut tombol / kartu" value={value.buttonRadius} min={0} max={32} step={2} unit="px" onChange={(next) => update("buttonRadius", next)} />
        <Range label="Ketebalan garis" value={value.borderWidth} min={0} max={3} unit="px" onChange={(next) => update("borderWidth", next)} />
      </div>
    </details>
  </section>;
}
