# NAMINA: GitHub Actions ke DomainMurah via FTPS

Workflow: `.github/workflows/build-hosting.yml`.

Saat perubahan masuk ke branch `main`, GitHub Actions memeriksa TypeScript, unit test, PHP, membangun paket HTML/PHP, dan menjalankan tes browser. Kalau semuanya lulus dan variable `NAMINA_AUTO_DEPLOY_ENABLED` adalah `true`, job deploy mengirim paket build ke hosting melalui **FTPS eksplisit dengan TLS dan verifikasi sertifikat**. Tidak perlu SSH eksternal, `rsync`, Node.js di hosting, atau ekstraksi ZIP.

## Satu kali: akun FTPS khusus

1. Di **cPanel → FTP Accounts**, buat akun khusus deploy, misalnya `namina_deploy@namina.biz.id`. Gunakan password acak yang kuat. **Directory harus persis `public_html`**, bukan `public_html/namina.biz.id/namina_deploy` yang sering terisi otomatis. Akun ini tidak boleh bisa masuk ke folder lain.
2. Di **File Manager → public_html**, buat file teks `namina-deploy-check.txt` berisi tepat:

   ```text
   NAMINA-DEPLOY-TARGET
   ```

   File ini hanya tanda lokasi upload dan tidak berisi credential.
3. Konfirmasikan hostname FTPS dan sertifikat TLS yang valid dari penyedia hosting atau fitur **Configure FTP Client**. Gunakan **FTPS eksplisit port 21**, bukan SFTP atau FTPS implisit port 990. Nama host dalam koneksi harus cocok dengan sertifikat. Jangan mematikan pengecekan sertifikat.
4. Buka [GitHub Settings Actions](https://github.com/PebisnisDigital/namina-hosting/settings/secrets/actions) → **New repository secret**. Masukkan empat nilai ini:

   | Secret | Isi |
   | --- | --- |
   | `NAMINA_FTPS_HOST` | Hostname FTPS yang sertifikatnya sesuai (bukan URL) |
   | `NAMINA_FTPS_PORT` | `21` jika penyedia mengonfirmasi port standar |
   | `NAMINA_FTPS_USER` | Username akun FTP khusus secara lengkap |
   | `NAMINA_FTPS_PASSWORD` | Password akun FTP khusus |

   Simpan password hanya lewat halaman GitHub Secrets. Jangan taruh password di repo, screenshot, atau chat.
5. Setelah akun dan marker siap, buka **GitHub Settings → Secrets and variables → Actions → Variables**, buat variable `NAMINA_AUTO_DEPLOY_ENABLED` bernilai `true`.
6. Di tab **Actions → Export NAMINA for DomainMurah → Run workflow**, jalankan `main`. Pantau job **Deploy NAMINA to DomainMurah**, lalu cek `https://namina.biz.id/`, `/vini`, `/generator`, dan halaman klien yang sudah terbit.

## Revisi berikutnya

Setiap commit/push ke `main` akan menguji dan mengunggah seluruh paket website yang baru secara otomatis jika semua tes lulus. **FTPS tidak melakukan penghapusan**. Data dinamis `clients/*.json` tetap ada; hanya `clients/vini.json` (demo yang dikelola kode) bisa diperbarui. Folder halaman klien `/{slug}`, file media, dan aset JS/CSS lama juga tetap tersimpan.

File yang diunggah tidak mencakup folder privat `namina-private` di luar `public_html` atau password/token administrator. Perubahan template HTML baru tidak otomatis menulis ulang salinan HTML pada halaman klien yang sudah diterbitkan; hal itu memerlukan migrasi terpisah.

## Jika pengiriman gagal

- **Marker tidak cocok:** pastikan akun FTP diarahkan tepat ke `public_html`, dan marker ada di akar akun tersebut.
- **TLS certificate mismatch:** minta hostname FTP yang sertifikatnya cocok dari penyedia. Jangan gunakan `ssl:verify-certificate false`.
- **Timeout / GitHub runner diblokir:** minta bantuan penyedia membuka koneksi FTPS dari GitHub Actions, atau pindah ke Git Version Control cPanel dengan pembaruan terjadwal melalui Cron Jobs.

**Catatan:** Dalam mode *pull* dari GitHub, tombol cPanel **Update from Remote** dan **Deploy HEAD Commit** bersifat manual. Hanya push langsung ke repository cPanel yang memicu post-receive deploy otomatis. Jangan menganggap koneksi GitHub biasa saja sudah membuat cPanel mendeteksi setiap push.
