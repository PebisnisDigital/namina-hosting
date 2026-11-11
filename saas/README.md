# NAMINA Business — fondasi SaaS PHP/MySQL

Status: **kode persiapan, BELUM siap produksi**. Tidak mengubah sistem generator PHP+JSON yang kini aktif, tidak menjalankan migrasi otomatis, dan tidak memindahkan DNS atau data.

## Keputusan produk
- Lisensi mitra **sekali bayar**; tidak ada tagihan bulanan/tahunan lisensi.
- Branding tetap NAMINA; mitra dapat membuat dan menerbitkan website klien sesuai jatah slot.
- Harga, kuota final, perlindungan website klien, dan batas wajar trafik/storage harus ditetapkan sebelum penjualan.
- Pembayaran manual: invoice → bukti transaksi → verifikasi superadmin → aktivasi lisensi.
- Mitra hanya boleh mengakses website miliknya. Klien hanya mengakses situs yang diberi izin dan token terbatas.
- Seluruh media klien memakai URL HTTPS eksternal jika disepakati; basis data mencatat metadata.
- Basis server: PHP 8.2+, MySQL/MariaDB, cPanel DomainMurah, TANPA Supabase/Vercel.

## Tahap 1 — cek hosting aktual (belum diverifikasi)
1. Buka cPanel DomainMurah, pastikan menu **Manage My Databases / MySQL Databases** dan **phpMyAdmin** tersedia. Catat versi MySQL/MariaDB dan PHP (tanpa membagikan password).
2. Pastikan PHP CLI memiliki ekstensi **pdo_mysql** (jalankan `php -m | grep -i pdo` di Terminal cPanel).
3. Buat database baru (contoh nama `namina93_business`) dan pengguna DB **khusus** database tersebut. Berikan izin hanya untuk database yang baru; jangan pakai root.
4. Simpan `config.local.php` dari template sebagai `/home/namina93/namina-private/business/config.local.php`, di luar webroot, dengan izin file 0600 jika memungkinkan.
5. Tempatkan `check-db.php` dalam folder privat yang sama lalu jalankan `php check-db.php`. Bila terhubung tetapi skema belum lengkap, status itu **normal**.
6. Setelah **backup dan verifikasi database yang dipilih**, import `schema.sql` melalui phpMyAdmin ke database Business yang baru. Script hanya menggunakan `CREATE TABLE IF NOT EXISTS`; tidak ada DROP/DELETE.
7. Jalankan lagi `php check-db.php`. Target: koneksi berhasil dan 10 tabel ada.

Jangan unggah `config.local.php`, foto bukti bayar, atau data pribadi mitra ke GitHub/public_html. Jangan kirim password database lewat chat.

## Arsitektur keamanan sebelum pendaftaran publik
- Password memakai `password_hash()` / `password_verify()`, tidak disimpan plaintext.
- Login via PHP session cookie Secure+HttpOnly+SameSite dan rotasi session ID, form menggunakan CSRF token.
- Throttle login; saat login dan semua mutasi cek `role`, `status`, lisensi dan `owner_user_id` pada server.
- Kuota website aktif dikunci dengan transaksi DB: `SELECT ... FOR UPDATE`, hitung situs aktif, lalu reservasi slug/tambah situs dalam transaksi yang sama.
- Setiap slug harus unik secara global (UNIQUE di DB). Jangan pernah mengandalkan ID/role dari browser saja.
- Publikasi menulis HTML/JSON via proses terkontrol, dengan validasi path, lock, backup, dan rollback jika gagal.
- Magic link klien disimpan sebagai SHA-256 hash; token asli hanya tampil saat pembuatan dan tidak dilog.
- Bukti transfer harus disimpan privat, diverifikasi tipe/ukuran file dan aksesnya dibatasi superadmin.
- Versi website dan riwayat transaksi tidak dihapus saat mitra dinonaktifkan.

## Tahap berikutnya (belum dibuat)
2. API pendaftaran/login, verifikasi pembayaran, aktivasi lisensi.
3. Dashboard dan query mitra yang terisolasi.
4. Integrasi generator dengan owner + kuota, migrasi situs JSON yang disetujui.
5. Uji end-to-end dua mitra terpisah, lalu ZIP final untuk cPanel.

## Batas yang wajib diketahui
GitHub Pages tidak menjalankan PHP/MySQL. Jangan menerbitkan URL registrasi publik sebelum login, pembatasan hak akses, transaksi kuota, dan tes keamanan lintas akun benar-benar lulus. Skema SQL belum dijalankan di hosting; koneksi database belum diverifikasi dari sini.
