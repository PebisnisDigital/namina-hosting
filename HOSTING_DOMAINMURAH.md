# NAMINA: ekspor untuk Cloud Hosting DomainMurah

Tahap 2 menyiapkan halaman publik `/` dan `/vini` dalam bentuk paket statis.
Tampilan dan interaksinya menggunakan source yang sama dengan NAMINA saat ini.

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
- `clients/`, `animated-icons/`, `videos/`, `images/`, `icons/` dan aset publik lainnya.

Unggah **isi** `hosting-dist/`, bukan folder source React, ke direktori `public_html` domain.
Jangan mengunggah `node_modules`, `.env`, atau source aplikasi ke `public_html`.

## Batasan tahap ini

- Situs bisa berjalan di hosting statis tanpa proses Node.js atau Express di server.
- CSS dan JavaScript tetap dibutuhkan di browser untuk animasi, navigasi kartu,
  pemuatan data JSON, dan pemutaran video. Hasil build masih memuat runtime React
  yang terbungkus di JavaScript statis, agar tampilan dan perilaku tetap identik.
- `vini/index.html` memakai entry yang sama dengan `/vinihtml`. Video diatur agar
  autoplay, muted, loop, dan playsInline seperti di sumbernya.
- Halaman `/studio`, `/generator`, publikasi klien, dan backend izin editor
  **belum** dipindahkan. Tahap ini tidak boleh dianggap siap untuk fitur tersebut.
- Jika video/gambar memakai tautan Dropbox, pastikan tautan HTTPS dapat dibuka
  secara langsung. Situs tetap menyediakan aset fallback bawaan yang ikut dibuild.

## Pemeriksaan awal setelah upload

1. Buka `/` dan periksa semua tombol termasuk WhatsApp dan link contoh.
2. Buka `/vini/` di komputer dan ponsel. Periksa video autoplay dan loop.
3. Pilih tab Nama, Karir, Skill, Karya, Produk; uji slider dan popup kartu.
4. Pastikan seluruh URL `/assets/*`, `/clients/vini.json`, dan `/videos/*`
   tidak menampilkan 404 pada tab Network browser.

**Catatan:** Domain dan DNS belum diarahkan ke hosting dalam tahap ini.
