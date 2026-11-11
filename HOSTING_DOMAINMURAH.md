# NAMINA: website + generator untuk Cloud Hosting DomainMurah

Tahap 2 menyiapkan halaman publik `/` dan `/vini` dalam bentuk paket statis.
Tahap 3 menambahkan `/generator/`, template semua `/{namaklien}/`, dan API PHP
untuk draft, magic link, izin publish, review admin, serta unduh paket HTML.
Source dan deploy Vercel lama **tidak diubah** oleh proyek ini.

## Hasil build

Di komputer pengembang atau GitHub Actions:

```bash
npm ci
npm run build:hosting
```

Isi folder `hosting-dist/` adalah **file jadi** yang dibutuhkan hosting:

- `index.html`: landing page `/`.
- `vini/index.html`: halaman `/vini` (pada Apache/LiteSpeed, `/vini` akan diarahkan ke `/vini/`).
- `assets/`: CSS dan JavaScript yang sudah dikompilasi.
- `generator/index.html`: editor private tanpa login akun.
- `generator-preview/index.html`: pratinjau interaktif PC/HP di dalam editor.
- `client/index.html`: template yang disalin PHP saat publish klien.
- `api/generator.php`: backend PHP untuk simpan draft, izin, dan publish.
- `api/setup-generator.php`: inisialisasi via **terminal saja**, bukan browser.
- `clients/`, `animated-icons/`, `videos/`, `images/`, `icons/` dan aset publik lainnya.

Unggah **isi** `hosting-dist/`, bukan folder source React, ke direktori `public_html` domain.
Jangan mengunggah `node_modules`, `.env`, atau source aplikasi ke `public_html`.

## Kebutuhan hosting

- PHP **8.2 atau lebih baru** dengan ekstensi **ZipArchive** aktif.
- Apache/LiteSpeed cPanel yang dapat meneruskan header `Authorization` ke PHP.
- Akses SSH/Terminal cPanel untuk langkah inisialisasi satu kali.
- SSL HTTPS aktif sebelum membuka magic link editor.
- Izin menulis pada `public_html/clients/` dan folder klien yang dibuat PHP.

Folder privat yang menyimpan token dalam bentuk hash serta draft dibuat di
`<home-user>/namina-private/`, **di luar `public_html`**. Folder ini tidak boleh
dimasukkan ke repo GitHub atau diunggah ke lokasi publik. API PHP mencari folder
ini secara otomatis jika isi `hosting-dist/` ditempatkan tepat di `public_html/`.

## Setup pertama di cPanel (setelah hosting siap)

1. Unduh artefak `namina-html-domainmurah` dari tab Actions di repo ini.
2. Ekstrak lalu unggah **seluruh isinya** ke `public_html/`, termasuk `.htaccess`
   di folder `api/`. Jangan upload source React atau `.env`.
3. Di cPanel pilih versi PHP 8.2+ dan aktifkan `zip` jika belum aktif.
4. Buka Terminal SSH cPanel dan jalankan (sesuaikan direktori user):

   ```bash
   cd public_html
   php api/setup-generator.php
   ```

5. Simpan **link admin** yang keluar dari terminal di pengelola password. Token
   hanya ditampilkan sekali; sistem menyimpan hash saja. Jangan kirim link admin
   ini kepada klien.
6. Buka link admin lewat domain HTTPS, kemudian buat satu klien uji dulu.

Jika hosting menyimpan file web di lokasi selain `public_html`, tetapkan
`NAMINA_PRIVATE_DIR` ke direktori khusus **di luar webroot** saat setup dan saat
menjalankan PHP. Jangan pakai direktori publik sebagai folder privat.

## Alur penggunaan generator

1. Admin membuka `/generator/#token=...` (link privat).
2. Isi slug, nama, dan brief klien. Parser membaca baris seperti `Nama:`,
   `Profesi:`, `WhatsApp:`, `Skill:`, dan `Karir:`.
3. Pilih `Klien boleh publish sendiri` atau `Butuh persetujuan admin`.
4. Editor menyiapkan template Original yang bisa diedit: Nama, Karir, Skill,
   Karya, Produk, warna, link Dropbox, video desktop/mobile dan posisi model di HP.
5. Gunakan tombol **PC/HP** untuk melihat hasil langsung, lalu **Simpan draft**.
6. Klik **Publish sekarang** atau **Ajukan publish** sesuai izin klien.
7. Klik **Unduh HTML** untuk mendapatkan ZIP website tunggal. Isi ZIP dapat
   diunggah ke root `public_html` domain milik klien tanpa PHP/Node runtime.
8. Salin link edit pribadi yang muncul sekali setelah klien dibuat lalu kirim
   secara manual melalui WhatsApp. **Jangan** mengirim link admin.

Link klien tidak membutuhkan login. Token acak 256-bit hanya tersimpan sebagai
hash di server. Token berada di fragmen URL `#token=...`, bukan query yang
dikirim ke log HTTP, dan dipindahkan ke `sessionStorage` browser setelah dibuka.
Siapa pun yang mendapat link tersebut dapat mengubah website klien itu. Admin
dapat menerbitkan ulang link (rotasi); link lama langsung tidak berlaku.

Untuk mode persetujuan, tombol klien hanya menandai revisi sebagai *pending*.
Admin memilih klien bertanda "menunggu persetujuan" lalu **Setujui & terbitkan**
atau **Tolak revisi**. Revisi yang ditolak tidak mengganti website publik.

Semua draft disimpan dalam file JSON privat di server; foto/video klien tetap
direferensikan lewat link HTTPS Dropbox. Beberapa ikon, gambar fallback, dan
video bawaan NAMINA tetap ikut sebagai aset website.

## Batasan dan persiapan cutover

- Situs bisa berjalan di hosting statis tanpa proses Node.js atau Express di server.
- CSS dan JavaScript tetap dibutuhkan di browser untuk animasi, navigasi kartu,
  pemuatan data JSON, dan pemutaran video. Hasil build masih memuat runtime React
  yang terbungkus di JavaScript statis, agar tampilan dan perilaku tetap identik.
- `vini/index.html` memakai entry yang sama dengan `/vinihtml`. Video diatur agar
  autoplay, muted, loop, dan playsInline seperti di sumbernya.
- `/studio` pada proyek Vercel lama tetap terpisah; versi cPanel memakai
  `/generator/` dan API PHP. Tidak ada migrasi data klien otomatis dari Vercel.
- Perubahan di generator cPanel hanya mengubah website yang dipublikasikan oleh
  hosting cPanel, **bukan** website di Vercel.
- Backend perlu diuji **di paket Cloud Professional aktual** sebelum domain
  utama diarahkan. Uji juga header `Authorization`, izin tulis, PHP ZipArchive,
  dan akses HTTPS. Belum ada jaminan semua fitur shared hosting sama persis.
- Untuk mengunggah ZIP website mandiri, isi ZIP harus berada di root domain;
  path `/assets/*` dan `/clients/*` bersifat root-relative.
- Jika video/gambar memakai tautan Dropbox, pastikan tautan HTTPS dapat dibuka
  secara langsung. Situs tetap menyediakan aset fallback bawaan yang ikut dibuild.

## Pemeriksaan awal setelah upload

1. Buka `/` dan periksa semua tombol termasuk WhatsApp dan link contoh.
2. Buka `/vini/` di komputer dan ponsel. Periksa video autoplay dan loop.
3. Pilih tab Nama, Karir, Skill, Karya, Produk; uji slider dan popup kartu.
4. Pastikan seluruh URL `/assets/*`, `/clients/vini.json`, dan `/videos/*`
   tidak menampilkan 404 pada tab Network browser.

**Catatan:** Domain dan DNS belum diarahkan ke hosting dalam tahap ini.
