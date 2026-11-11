# Alur review NAMINA sebelum upload DomainMurah

## 1. Review tampilan di GitHub Pages

Repo: `PebisnisDigital/namina-hosting`.

Di GitHub pilih **Settings > Pages > Build and deployment > Source: GitHub Actions**.
Setelah source diaktifkan, workflow **Preview NAMINA on GitHub Pages**
menyiapkan halaman review di:

`https://pebisnisdigital.github.io/namina-hosting/`

URL ini baru bisa dibuka setelah workflow berhasil dan fitur Pages tersedia
untuk paket GitHub akun tersebut. Repo saat ini berstatus **private**;
GitHub Pages untuk repo private bergantung pada paket GitHub yang dipakai.
Jangan mengubah repo menjadi public tanpa persetujuan Teh Vini.

Preview ini sengaja hanya memuat halaman publik: landing page, `/vini/`,
`/privacy/`, dan `/terms/`. Data pribadi editor, kunci akses, server PHP,
dan endpoint generator tidak dipublikasikan. Halaman publik yang direview
adalah versi statis yang dibangun dari source yang sama dengan paket cPanel.

## 2. Uji fungsi generator sebelum rilis

GitHub Pages **tidak menjalankan PHP**. Artinya pembuatan akun klien,
penyimpanan draft, perubahan konten, persetujuan, dan publish tidak dapat
dinilai dari alamat GitHub Pages.

Pengujian otomatis menjalankan TypeScript, unit tests, serta uji backend PHP
sebelum paket ZIP final diterbitkan. Pengujian browser memeriksa tampilan
publik di desktop dan mobile. Untuk pengujian end-to-end PHP di server
sesungguhnya tetap perlu cPanel atau server staging PHP setara.

## 3. Buat ZIP hanya sesudah disetujui

Setelah desain dan isi review sudah final:

1. Pilih **Actions > Download final NAMINA ZIP > Run workflow**.
2. Tunggu semua pemeriksaan selesai dan status workflow **hijau**.
3. Di akhir run, unduh artifact `namina-domainmurah-final-zip`.
4. Ekstrak file unduhan GitHub Actions sekali. Di dalamnya ada
   `namina-domainmurah-final.zip`.
5. Simpan cadangan `public_html`, khususnya data klien aktif, sebelum upload.
6. Di cPanel File Manager, buka `public_html`, unggah file ZIP final,
   lalu **Extract** di folder tersebut. Pastikan `index.html`, `api/`,
   `assets/`, dan `clients/` berada langsung di `public_html`.

ZIP sengaja tidak menghapus file klien yang sudah berada di server. Namun,
file berpath sama dapat tertimpa saat ekstraksi, sehingga cadangan tetap wajib.

Selama FTPS DomainMurah belum sehat, matikan variable GitHub Actions
`NAMINA_AUTO_DEPLOY_ENABLED` (set ke `false`) di **Settings > Secrets and
variables > Actions > Variables** agar job upload otomatis tidak berjalan.
