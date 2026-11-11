import { useEffect, useRef, useState, type FormEvent } from "react";
import { clientBriefSchema, type ClientBrief } from "../domain/brief";
import "../client-form.css";

type BriefField = Exclude<keyof ClientBrief, "consent">;

const sections: Array<{ id: string; index: string; title: string; note: string }> = [
  { id: "identitas", index: "01", title: "Tentang diri", note: "Kenalkan diri dan cerita di balik nama Anda." },
  { id: "perjalanan", index: "02", title: "Pendidikan & pengalaman", note: "Tulis perjalanan yang ingin orang lain kenal." },
  { id: "karya", index: "03", title: "Produk & karya", note: "Apa yang Anda kerjakan, tawarkan, atau banggakan?" },
  { id: "kontak", index: "04", title: "Kontak & sosial media", note: "Pilih cara orang terhubung dengan Anda." },
  { id: "tampilan", index: "05", title: "Arah visual website", note: "Bekal tim NAMINA untuk membuat foto, video, dan halaman Anda." },
];

const fields: BriefField[] = [
  "fullName", "displayName", "profession", "brand", "birthPlace", "birthDate", "city", "address",
  "email", "whatsapp", "bio", "education", "skills", "experience", "achievements", "certificates",
  "hobbies", "services", "products", "audience", "portfolio", "testimonials", "instagram",
  "facebook", "tiktok", "youtube", "linkedin", "website", "photoUrl", "videoUrl", "headline",
  "preferredStyle", "characterNotes", "specialRequest", "requestedSlug",
];

function Field({ name, label, hint, required, multiline, wide, type = "text", placeholder }: {
  name: BriefField;
  label: string;
  hint?: string;
  required?: boolean;
  multiline?: boolean;
  wide?: boolean;
  type?: string;
  placeholder?: string;
}) {
  const inputId = `brief-${name}`;
  return (
    <div className={`client-form__field${wide ? " client-form__field--wide" : ""}`}>
      <label htmlFor={inputId}>{label}{required && <span className="client-form__required"> *</span>}</label>
      {hint && <p id={`${inputId}-hint`} className="client-form__hint">{hint}</p>}
      {multiline
        ? <textarea id={inputId} name={name} rows={4} placeholder={placeholder} aria-describedby={hint ? `${inputId}-hint` : undefined} />
        : <input id={inputId} name={name} type={type} required={required} placeholder={placeholder}
          aria-describedby={hint ? `${inputId}-hint` : undefined}
          autoComplete={name === "fullName" ? "name" : name === "email" ? "email" : name === "whatsapp" ? "tel" : undefined} />}
    </div>
  );
}

export function ClientForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const previous = document.title;
    document.title = "Formulir Klien | NAMINA.PRO";
    return () => { document.title = previous; };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setError("");
    const raw = new FormData(event.currentTarget);
    const data = Object.fromEntries(fields.map((name) => [name, String(raw.get(name) || "")]));
    const parsed = clientBriefSchema.safeParse({ ...data, consent: raw.get("consent") === "on" });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Periksa kembali isian formulir.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/formulir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ brief: parsed.data, websiteTrap: raw.get("websiteTrap") || "" }),
      });
      const result = await response.json() as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error || "Formulir belum berhasil dikirim. Coba lagi.");
      setReceipt(result.id);
      formRef.current?.reset();
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Koneksi terputus. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="client-form">
      <header className="client-form__header">
        <a href="/" className="client-form__brand" aria-label="NAMINA.PRO, beranda">NAMINA<span>.PRO</span></a>
        <span>Formulir biodata klien</span>
      </header>

      <main className="client-form__layout">
        <aside className="client-form__intro" aria-label="Panduan pengisian">
          <div className="client-form__intro-inner">
            <p className="client-form__overline">Ruang cerita Anda</p>
            <h1>Setiap nama punya cerita.</h1>
            <p>Bantu kami mengenal perjalanan, pekerjaan, dan karya Anda. Dari jawaban inilah tim NAMINA menyiapkan website personal Anda.</p>
            <nav aria-label="Bagian formulir">
              {sections.map((section) => (
                <a key={section.id} href={`#${section.id}`}><span>{section.index}</span>{section.title}</a>
              ))}
            </nav>
            <p className="client-form__aside-note">Isi yang Anda ketahui dulu. Kolom tanpa tanda * boleh dilewati. Tanggal lahir dan alamat hanya untuk brief internal, tidak otomatis ditampilkan di website.</p>
          </div>
        </aside>

        <div className="client-form__content">
          {receipt ? (
            <section className="client-form__success" role="status" aria-live="polite">
              <p className="client-form__overline">Data diterima</p>
              <h2>Terima kasih. Ceritanya sudah sampai!</h2>
              <p>Brief Anda tersimpan dan masuk daftar kerja tim NAMINA. Simpan kode ini bila ingin menanyakan progres:</p>
              <strong className="client-form__receipt">NM-{receipt.slice(0, 8).toUpperCase()}</strong>
              <p>Tim kami akan memeriksa kelengkapan data sebelum menyiapkan website.</p>
              <button type="button" onClick={() => setReceipt("")}>Isi formulir lain</button>
            </section>
          ) : (
            <form ref={formRef} onSubmit={submit}>
              <div className="client-form__preface">
                <p className="client-form__overline">Brief pembuatan website</p>
                <h2>Mulai dari biodata.</h2>
                <p>Gunakan bahasa sehari-hari. Tak perlu menulis seperti CV resmi. Tanda <span className="client-form__required">*</span> berarti wajib.</p>
              </div>

              <section id="identitas" className="client-form__section" aria-labelledby="identitas-title">
                <div className="client-form__section-top"><span>01 / Identitas</span><h3 id="identitas-title">Siapa Anda?</h3><p>Nama, profesi, dan cerita perkenalan.</p></div>
                <div className="client-form__fields">
                  <Field name="fullName" label="Nama lengkap" required placeholder="Nama sesuai yang ingin dicatat" />
                  <Field name="displayName" label="Nama yang tampil di website" placeholder="Boleh berupa nama panggilan atau gelar" />
                  <Field name="profession" label="Profesi / pekerjaan utama" required placeholder="Contoh: guru, konsultan, pemilik usaha" />
                  <Field name="brand" label="Nama usaha / komunitas" placeholder="Jika ada" />
                  <Field name="birthPlace" label="Tempat lahir" hint="Privat, opsional." />
                  <Field name="birthDate" label="Tanggal lahir" type="date" hint="Privat, opsional." />
                  <Field name="city" label="Domisili (kota/kabupaten)" />
                  <Field name="address" label="Alamat" wide multiline hint="Opsional. Tak perlu menulis alamat rumah lengkap jika tidak diperlukan." />
                  <Field name="bio" label="Ceritakan diri Anda" wide multiline hint="Misalnya perjalanan singkat, nilai yang dipegang, atau alasan memilih profesi ini." />
                </div>
              </section>

              <section id="perjalanan" className="client-form__section" aria-labelledby="perjalanan-title">
                <div className="client-form__section-top"><span>02 / Perjalanan</span><h3 id="perjalanan-title">Apa yang membentuk Anda?</h3><p>Pengalaman nyata lebih menarik daripada gelar yang dipaksakan.</p></div>
                <div className="client-form__fields">
                  <Field name="education" label="Riwayat pendidikan" wide multiline hint="Sekolah, jurusan, perguruan tinggi, atau pelatihan." />
                  <Field name="skills" label="Keahlian / kompetensi" wide multiline hint="Pisahkan dengan baris baru agar mudah dijadikan kartu website." />
                  <Field name="experience" label="Pengalaman kerja / organisasi" wide multiline />
                  <Field name="achievements" label="Pencapaian & penghargaan" wide multiline />
                  <Field name="certificates" label="Sertifikasi / lisensi" wide multiline />
                  <Field name="hobbies" label="Hobi / minat pribadi" wide multiline />
                </div>
              </section>

              <section id="karya" className="client-form__section" aria-labelledby="karya-title">
                <div className="client-form__section-top"><span>03 / Karya</span><h3 id="karya-title">Apa yang ingin dikenal orang?</h3><p>Produk, jasa, karya, dan siapa yang Anda bantu.</p></div>
                <div className="client-form__fields">
                  <Field name="services" label="Jasa / layanan" wide multiline hint="Tulis nama dan manfaat tiap layanan." />
                  <Field name="products" label="Produk yang dijual" wide multiline hint="Jika ada, sertakan cara pemesanan atau tautannya." />
                  <Field name="audience" label="Siapa yang biasa Anda bantu?" wide multiline />
                  <Field name="portfolio" label="Portofolio / karya / proyek" wide multiline hint="Nama karya, keterangan singkat, dan tautan bila ada." />
                  <Field name="testimonials" label="Testimoni asli (jika boleh dipublikasikan)" wide multiline hint="Tulis hanya testimoni nyata dan sudah mendapat izin dari pemberinya." />
                </div>
              </section>

              <section id="kontak" className="client-form__section" aria-labelledby="kontak-title">
                <div className="client-form__section-top"><span>04 / Kontak</span><h3 id="kontak-title">Bagaimana orang menghubungi Anda?</h3><p>Isi tautan akun yang memang ingin ditampilkan.</p></div>
                <div className="client-form__fields">
                  <Field name="whatsapp" label="Nomor WhatsApp aktif" type="tel" required placeholder="08... atau +62..." />
                  <Field name="email" label="Email aktif" type="email" placeholder="nama@email.com" />
                  <Field name="instagram" label="Instagram (URL HTTPS)" type="url" placeholder="https://instagram.com/..." />
                  <Field name="facebook" label="Facebook (URL HTTPS)" type="url" placeholder="https://facebook.com/..." />
                  <Field name="tiktok" label="TikTok (URL HTTPS)" type="url" placeholder="https://tiktok.com/@..." />
                  <Field name="youtube" label="YouTube (URL HTTPS)" type="url" placeholder="https://youtube.com/@..." />
                  <Field name="linkedin" label="LinkedIn (URL HTTPS)" type="url" placeholder="https://linkedin.com/in/..." />
                  <Field name="website" label="Website / toko online (URL HTTPS)" type="url" placeholder="https://..." />
                </div>
              </section>

              <section id="tampilan" className="client-form__section" aria-labelledby="tampilan-title">
                <div className="client-form__section-top"><span>05 / Visual</span><h3 id="tampilan-title">Seperti apa website Anda nanti?</h3><p>Foto dan video dibuat sesuai identitas, outfit, dan profesi Anda.</p></div>
                <div className="client-form__fields">
                  <Field name="headline" label="Kalimat pembuka / tagline" wide placeholder="Jika ada kalimat yang ingin ditonjolkan" />
                  <Field name="requestedSlug" label="Nama link yang diinginkan" placeholder="contoh: namaklien" hint="Huruf kecil, angka, dan tanda hubung. Tim akan memeriksa ketersediaannya." />
                  <Field name="preferredStyle" label="Nuansa visual yang disukai" placeholder="Misalnya: hangat, formal, energik" />
                  <Field name="photoUrl" label="Tautan foto referensi (HTTPS)" type="url" hint="Google Drive atau Dropbox. Pastikan tim dapat membuka linknya. Foto bisa dikirim terpisah jika belum ada." />
                  <Field name="videoUrl" label="Tautan video referensi (HTTPS)" type="url" hint="Opsional. Diisi jika sudah ada video contoh." />
                  <Field name="characterNotes" label="Catatan outfit, gaya berjalan, dan ekspresi" wide multiline hint="Misalnya: pertahankan seragam di foto, ekspresi ramah dan percaya diri." />
                  <Field name="specialRequest" label="Permintaan khusus / hal yang tidak boleh diubah" wide multiline />
                </div>
              </section>

              <section className="client-form__submit" aria-labelledby="submit-title">
                <h3 id="submit-title">Periksa sekali lagi.</h3>
                <p>Tim NAMINA akan membaca brief ini terlebih dahulu. Informasi pribadi seperti tanggal lahir dan alamat tidak akan otomatis dipublikasikan.</p>
                <label className="client-form__consent">
                  <input type="checkbox" name="consent" required />
                  <span>Saya mengizinkan tim NAMINA memproses data dan tautan yang saya kirim untuk keperluan pembuatan website personal. Saya sudah membaca <a href="/privacy" target="_blank" rel="noreferrer">informasi privasi</a>.</span>
                </label>
                <div className="client-form__honeypot" aria-hidden="true"><label htmlFor="websiteTrap">Kosongkan kolom ini</label><input id="websiteTrap" name="websiteTrap" tabIndex={-1} autoComplete="off" /></div>
                {error && <p className="client-form__error" role="alert">{error}</p>}
                <button className="client-form__send" type="submit" disabled={submitting}>
                  {submitting ? "Sedang mengirim…" : "Kirim biodata"}
                </button>
                <p className="client-form__footnote">Jangan kirim NIK, foto KTP, kata sandi, atau informasi keuangan melalui formulir ini.</p>
              </section>
            </form>
          )}
          <footer className="client-form__footer"><span>NAMINA.PRO</span><a href="/">Kembali ke beranda</a></footer>
        </div>
      </main>
    </div>
  );
}
