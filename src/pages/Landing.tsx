import { NaminaLogo } from "../components/NaminaLogo";
import { Shell } from "./shared";
import { publicPath } from "../static/publicPath";
import "../landing.css";

const whatsappNumber = "62881022445869";
const registrationMessage =
  "Halo Teh Vini, saya ingin mendaftar jasa pembuatan website personal sinematik NAMINA.PRO. Mohon dibantu proses pendaftarannya.";
const registrationUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(registrationMessage)}`;

const scatteredStory = [
  { place: "Di bio", situation: "Perkenalan sering cuma muat beberapa kalimat." },
  { place: "Di chat", situation: "Pengalaman dan layanan perlu dijelaskan lagi." },
  { place: "Di galeri", situation: "Karya bercampur dengan unggahan lain." },
];

const storyParts = [
  {
    title: "Kesan pertama yang punya karakter",
    detail: "Pembuka sinematik memperkenalkan sosokmu melalui tampilan dan cerita yang kamu pilih.",
    effect: "Orang mendapat gambaran tentangmu sebelum memulai obrolan.",
  },
  {
    title: "Keahlian mudah dipahami",
    detail: "Kartu interaktif memisahkan profil, pengalaman, kemampuan, dan cerita penting.",
    effect: "Calon klien atau perekrut bisa langsung menuju informasi yang dicari.",
  },
  {
    title: "Karya punya tempat sendiri",
    detail: "Portofolio dan pencapaian yang kamu miliki bisa ditampilkan bersama tautan pendukung.",
    effect: "Percakapan bisnis dan karier punya bahan yang lebih konkret.",
  },
  {
    title: "Satu link, banyak tempat berbagi",
    detail: "Tautan NAMINA bisa dibagikan lewat status WA, bio media sosial, proposal, atau kartu nama.",
    effect: "Orang menemukan profil yang sama tanpa perlu mengumpulkan tautan terpisah.",
  },
  {
    title: "Jalur kontak lebih jelas",
    detail: "Tombol dan tautan kontak dapat mengarahkan pengunjung ke WhatsApp atau kanalmu.",
    effect: "Setelah mengenalmu, pengunjung tahu cara memulai percakapan.",
  },
];

const impactParts = [
  {
    name: "Bisnis",
    title: "Calon klien datang dengan konteks.",
    description: "Perkenalkan layanan, pengalaman, dan hasil kerjamu dalam satu alur. Orang bisa melihat apa yang kamu tawarkan sebelum bertanya lewat WhatsApp.",
    takeaway: "Membantu percakapan penjualan lebih terarah.",
  },
  {
    name: "Karier",
    title: "Portofolio siap dikirim kapan saja.",
    description: "Saat melamar, berjejaring, atau menawarkan kolaborasi, bagikan satu halaman yang memuat keahlian, pengalaman, dan karya yang relevan.",
    takeaway: "Memudahkan orang menilai kemampuanmu.",
  },
  {
    name: "Omzet",
    title: "Lebih jelas jalan menuju order.",
    description: "Pengunjung yang tertarik bisa bergerak dari mengenal profil, melihat bukti kerja, lalu menghubungimu. Ini membuka peluang prospek, bukan menjamin penjualan.",
    takeaway: "Mendukung proses menuju transaksi dan tindak lanjut.",
  },
];

const orderSteps = [
  { title: "Chat Teh Vini", detail: "Ceritakan kebutuhan website-mu melalui WhatsApp." },
  { title: "Kirim bahan", detail: "Siapkan nama, foto atau video, dan isi cerita yang ingin tampil." },
  { title: "Lihat hasilnya", detail: "Tim NAMINA membuat website dan mengirimkan hasil untuk kamu tinjau." },
  { title: "Siap dibagikan", detail: "Setelah disetujui, website dipublikasikan dan link-nya bisa kamu bagikan." },
];

function WhatsAppLink({ label, className = "" }: { label: string; className?: string }) {
  return (
    <a className={`namina-landing__whatsapp ${className}`} href={registrationUrl} target="_blank" rel="noopener noreferrer">
      {label}
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="m5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

export function Landing() {
  return (
    <div className="namina-landing" id="beranda">
      <a className="namina-landing__skip" href="#konten">Lewati navigasi</a>
      <header className="namina-landing__header">
        <a className="namina-landing__brand" href="#beranda" aria-label="NAMINA, kembali ke atas">
          <NaminaLogo variant="compact" />
          <span className="namina-landing__brand-dot">.PRO</span>
        </a>
        <nav aria-label="Navigasi NAMINA">
          <a href="#contoh">Contoh</a>
          <a href="#layanan">Benefit</a>
          <a href="#dampak">Dampak</a>
          <a href="#cara-pesan">Cara pesan</a>
        </nav>
        <WhatsAppLink label="Pesan via WA" className="namina-landing__header-cta" />
      </header>

      <main id="konten">
        <section className="namina-landing__hero" aria-labelledby="namina-hero-title">
          <div className="namina-landing__hero-copy">
            <p className="namina-landing__eyebrow"><span aria-hidden="true" /> JASA WEBSITE PERSONAL SINEMATIK</p>
            <h1 id="namina-hero-title">KENALAN<br /><span>LEBIH</span><br />BERKESAN.</h1>
            <p className="namina-landing__hero-lead">
              Saat orang tertarik dengan namamu, beri mereka tempat untuk mengenal kemampuan, karya, dan caramu bekerja. Kami buatkan website personal sinematiknya.
            </p>
            <p className="namina-landing__hero-service">Kamu kirim bahan. Tim NAMINA yang mengerjakan.</p>
            <div className="namina-landing__hero-actions">
              <WhatsAppLink label="Daftar sekarang" />
              <a className="namina-landing__text-link" href="#contoh">Lihat hasilnya <span aria-hidden="true">↓</span></a>
            </div>
          </div>

          <div className="namina-landing__hero-stage" id="contoh">
            <div className="namina-landing__stage-meta" aria-hidden="true">
              <span>01 / NAMINA ORIGINAL</span>
              <span>CONTOH WEBSITE</span>
            </div>
            <a className="namina-landing__showcase" href={publicPath("/vini/")} aria-label="Buka contoh website interaktif Teh Vini">
              <img src={publicPath("/videos/vini-dropbox-poster.webp")} width="1280" height="720" fetchPriority="high" alt="Cuplikan website Teh Vini dengan latar panggung sinematik" />
              <span className="namina-landing__showcase-scrim" aria-hidden="true" />
              <span className="namina-landing__showcase-content">
                <span className="namina-landing__showcase-caption">CONTOH ASLI • KLIK UNTUK JELAJAHI</span>
                <strong>TEH VINI</strong>
                <span>AI ENTHUSIAST</span>
              </span>
              <span className="namina-landing__showcase-action">Buka demo <span aria-hidden="true">↗</span></span>
            </a>
            <p className="namina-landing__stage-note">Lihat animasi, video pembuka, dan kartu cerita langsung di contoh ini.</p>
          </div>
        </section>

        <section className="namina-landing__problem" aria-labelledby="namina-problem-title">
          <div className="namina-landing__problem-copy">
            <span className="namina-landing__index">KENAPA PERLU HALAMAN PERSONAL?</span>
            <h2 id="namina-problem-title">ORANG INGIN<br />KENAL KAMU.<br /><span>HARUS MULAI DARI MANA?</span></h2>
            <p>Orang bisa datang dari rekomendasi, status WA, atau media sosial. Kalau informasimu tersebar, mereka harus merangkai ceritanya sendiri.</p>
          </div>
          <div className="namina-landing__problem-list">
            {scatteredStory.map((item, index) => (
              <div className="namina-landing__problem-row" key={item.place}>
                <span>0{index + 1}</span>
                <div><h3>{item.place}</h3><p>{item.situation}</p></div>
              </div>
            ))}
            <p className="namina-landing__problem-answer">NAMINA memberi ceritamu satu alamat yang bisa langsung dibuka.</p>
          </div>
        </section>

        <section className="namina-landing__story" id="layanan" aria-labelledby="namina-story-title">
          <div className="namina-landing__section-heading">
            <span className="namina-landing__index">BENEFIT WEBSITE NAMINA</span>
            <h2 id="namina-story-title">YANG DILIHAT.<br /><span>YANG DIRASAKAN.</span></h2>
            <p>Fitur yang bagus punya tugas: membantu pengunjung mengenalmu, memahami nilaimu, lalu tahu cara menghubungimu.</p>
          </div>
          <div className="namina-landing__story-list">
            {storyParts.map((part, index) => (
              <article className="namina-landing__story-row" key={part.title}>
                <span className="namina-landing__story-number">0{index + 1}</span>
                <div>
                  <h3>{part.title}</h3>
                  <p>{part.detail}</p>
                  <p className="namina-landing__story-effect"><strong>Efeknya:</strong> {part.effect}</p>
                </div>
              </article>
            ))}
            <a className="namina-landing__story-demo" href={publicPath("/vini/")}>Jelajahi contoh Teh Vini <span aria-hidden="true">↗</span></a>
          </div>
        </section>

        <section className="namina-landing__impact" id="dampak" aria-labelledby="namina-impact-title">
          <div className="namina-landing__impact-heading">
            <span className="namina-landing__index">EFEKNYA BUAT KAMU</span>
            <h2 id="namina-impact-title">BISNIS.<br /><span>KARIER.</span><br />OMZET.</h2>
            <p>Website NAMINA membantu orang mengenal nilai yang kamu tawarkan. Dampaknya bergantung pada cara kamu membagikan link, kualitas penawaran, dan tindak lanjutnya.</p>
          </div>
          <div className="namina-landing__impact-list">
            {impactParts.map((impact, index) => (
              <article className="namina-landing__impact-row" key={impact.name}>
                <div className="namina-landing__impact-row-label"><span>0{index + 1}</span><h3>{impact.name}</h3></div>
                <div>
                  <h4>{impact.title}</h4>
                  <p>{impact.description}</p>
                  <p className="namina-landing__impact-takeaway">{impact.takeaway}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="namina-landing__process" id="cara-pesan" aria-labelledby="namina-process-title">
          <div className="namina-landing__process-intro">
            <span className="namina-landing__index">CARA PESAN</span>
            <h2 id="namina-process-title">TINGGAL KIRIM CERITA.<br /><span>BIAR KAMI BUATKAN.</span></h2>
            <p>Tidak perlu mengutak-atik website. Kamu cukup siapkan data dan materi, lalu tinjau hasilnya.</p>
            <WhatsAppLink label="Mulai pesan" />
          </div>
          <ol className="namina-landing__steps">
            {orderSteps.map((step, index) => (
              <li key={step.title}>
                <span>0{index + 1}</span>
                <div><h3>{step.title}</h3><p>{step.detail}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="namina-landing__closing" aria-labelledby="namina-closing-title">
          <span className="namina-landing__closing-label">NAMINA.PRO / CERITA KAMU</span>
          <h2 id="namina-closing-title">GILIRAN CERITAMU<br /><span>NAIK PANGGUNG.</span></h2>
          <WhatsAppLink label="Daftar via WA" />
          <p>Pendaftaran dan konsultasi langsung bersama Teh Vini.</p>
        </section>
      </main>

      <footer className="namina-landing__footer">
        <a href="#beranda" aria-label="NAMINA, kembali ke atas">NAMINA<span>.PRO</span></a>
        <span>Website personal sinematik. Dibuatkan untuk ceritamu.</span>
        <nav aria-label="Tautan informasi NAMINA"><a href={publicPath("/privacy/")}>Privasi</a><a href={publicPath("/terms/")}>Ketentuan</a></nav>
      </footer>
    </div>
  );
}
export function Legal({ terms }: { terms: boolean }) {
  return (
    <Shell>
      <main className="page prose">
        <h1>{terms ? "Ketentuan penggunaan" : "Privasi website"}</h1>
        <p>
          NAMINA.PRO sedang mempersiapkan layanan website personal.
          Pengelolaan halaman dilakukan tim admin.
        </p>
        {terms ? (
          <>
            <p>
              Gunakan hanya konten yang Anda miliki atau berhak publikasikan.
              Anda bertanggung jawab atas isi website dan tautan yang Anda
              terbitkan.
            </p>
            <p>
              Perubahan website dilakukan oleh tim admin melalui Studio.
              Publikasi memperbarui berkas konten di GitHub, lalu Vercel
              memperbarui website setelah deployment selesai.
            </p>
            <p>
              Ketentuan komersial, masa layanan, dan pengembalian dana belum
              ditetapkan. Hubungi pengelola melalui jalur undangan Anda sebelum
              penggunaan komersial.
            </p>
          </>
        ) : (
          <>
            <p>
              Biodata yang dikirim melalui /formulir, termasuk kontak dan data
              pribadi opsional, disimpan di database privat Supabase untuk
              diproses tim admin. Data formulir tidak langsung tampil di
              website publik.
            </p>
            <p>
              Data halaman yang dipublikasikan tersimpan sebagai berkas di
              repositori GitHub NAMINA. Tautan media dapat merujuk ke layanan
              pihak ketiga, misalnya Dropbox. Halaman klien dapat diakses umum.
            </p>
            <p>
              Studio admin memakai sesi login terbatas. Draft yang belum
              dipublikasikan dapat tersimpan pada browser yang sedang dipakai.
              Jangan gunakan komputer umum untuk mengelola data klien.
            </p>
            <p>
              Permintaan akses, koreksi, atau penghapusan data disampaikan ke
              pengelola melalui jalur undangan Anda. Kebijakan retensi dan
              kontak dukungan publik harus difinalkan sebelum peluncuran
              komersial.
            </p>
          </>
        )}
      </main>
    </Shell>
  );
}
