# NAMINA: otomatis deploy ke DomainMurah

Workflow: `.github/workflows/build-hosting.yml`

Setiap perubahan ke branch `main` menjalankan typecheck, tes PHP, build HTML, dan tes browser. Jika lulus dan variable `NAMINA_AUTO_DEPLOY_ENABLED` bernilai `true`, file hasil build dikirim ke `public_html` melalui SSH/rsync. Tidak perlu mengunggah atau mengekstrak ZIP lagi.

## Satu kali: sambungkan SSH

1. Di cPanel DomainMurah, buka **SSH Access / Manage SSH Keys**. Buat sepasang SSH key khusus deploy NAMINA, beri passphrase kosong untuk penggunaan noninteraktif dalam Actions, lalu **Authorize** public key. Simpan private key hanya di GitHub Actions secret. Jika memungkinkan, gunakan akun/izin yang dibatasi ke folder website.
2. Catat **SSH Host**, **SSH Port**, **Username cPanel**, dan document root website yang sudah digunakan. Untuk domain utama biasanya `/home/USERNAME/public_html`, tetapi verifikasi lewat File Manager sebelum mengisi target.
3. Pastikan server memiliki `rsync` dengan menjalankan `command -v rsync` melalui Terminal cPanel. Jika perintah kosong, tanyakan penyedia hosting agar mengaktifkan `rsync` untuk SSH akun ini.
4. Dapatkan host key SSH server dari penyedia hosting. Baris `known_hosts` harus memakai hostname dan port yang benar, dan fingerprint-nya harus cocok dengan keterangan resmi penyedia. Jangan melewati verifikasi fingerprint.
5. Buka repository GitHub `PebisnisDigital/namina-hosting` lalu **Settings → Secrets and variables → Actions → New repository secret**. Tambahkan keenam nama berikut:

   - `NAMINA_SSH_HOST`: hostname SSH dari cPanel/penyedia.
   - `NAMINA_SSH_PORT`: port SSH (angka).
   - `NAMINA_SSH_USER`: username cPanel.
   - `NAMINA_SSH_PRIVATE_KEY`: isi lengkap private key deploy.
   - `NAMINA_SSH_KNOWN_HOSTS`: baris known_hosts server yang fingerprint-nya sudah diverifikasi.
   - `NAMINA_PUBLIC_HTML`: path mutlak yang sudah diperiksa, misalnya `/home/USERNAME/public_html`.

   **Jangan kirim private key melalui WhatsApp atau chat.** Jangan menyimpan token admin NAMINA di repository.

6. Setelah semua nilai siap, buka **Settings → Secrets and variables → Actions → Variables → New repository variable**. Tambahkan `NAMINA_AUTO_DEPLOY_ENABLED` dengan nilai `true`.
7. Buka **Actions → Export NAMINA for DomainMurah → Run workflow → main** untuk menguji deployment pertama. Lihat job **Deploy NAMINA to DomainMurah** hingga berhasil, kemudian buka `https://namina.biz.id/`, `/vini`, dan `/generator`.

## Revisi berikutnya

Minta revisi ke ChatGPT, kemudian commit/push hasil revisi ke repository `PebisnisDigital/namina-hosting` branch `main`. GitHub akan membangun, mengetes, dan mengunggah perubahan secara otomatis setelah semua tes berhasil. Jika tes gagal, deploy tidak berjalan.

## Batas perlindungan data

- Folder privat `namina-private` ada **di luar** `public_html` dan tidak ikut workflow.
- JSON `clients/*.json` hasil publikasi generator **tidak ditimpa**, kecuali template demo `/clients/vini.json` yang memang dikelola GitHub.
- Folder halaman klien yang dibuat secara dinamis (`/{slug}`) **tidak dihapus** karena deployment tidak memakai `rsync --delete`.
- Berkas JS/CSS lama tidak dihapus supaya halaman klien yang memakai hash lama tetap berfungsi.
- Perubahan template HTML untuk klien **baru** otomatis tersedia. Halaman klien yang **sudah terbit** punya salinan HTML masing-masing, jadi perlu proses migrasi tersendiri bila ingin mengganti HTML mereka secara massal.
- Pengaturan `.htaccess` dan berkas lain yang tidak berada dalam paket build tidak dihapus. Jangan menyimpan secret dalam `hosting-dist`.

**Jangan aktifkan `NAMINA_AUTO_DEPLOY_ENABLED` sebelum host, port, fingerprint, dan folder tujuan benar-benar terverifikasi.**
