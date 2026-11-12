# NAMINA — Pengamanan deployment produksi cPanel

Status: **skrip produksi disiapkan, tetapi belum diaktifkan**. Deployment GitHub yang sekarang masih menuju /home/namina93/namina-deploy-preview.

## Yang sudah dipastikan

- Domain utama: namina.biz.id.
- Document Root: /home/namina93/public_html.
- Git clone: /home/namina93/repositories/namina-hosting, branch main.
- Hosting menggunakan PHP + folder namina-private di luar webroot.
- Publikasi klien menyimpan file JSON pada clients/ dan membuat subfolder berdasarkan slug klien (misalnya nadira/).
- File php.ini, marker deploy, namina.biz.id/ dan cgi-bin/ juga ada pada hosting; jangan ditimpa.
- Backup penuh cPanel telah dimulai dan pengguna menyatakan selesai; sebelum produksi pastikan arsipnya sudah **diunduh dan dapat dipulihkan**.

## Proses aman

Skrip scripts/deploy-cpanel-safe.sh memiliki dua mode:

- --check: hanya memeriksa build hosting, document root, marker, dan symlink. Tidak mengubah website.
- --apply: hanya menyalin daftar folder/file aplikasi, **tidak melakukan penghapusan**, serta membuat tar backup file yang akan ditimpa ke namina-private/deploy-backups. Perlu flag persetujuan yang eksplisit.

Folder aplikasi yang dikelola: animated-icons/, api/, assets/, client/ (hanya template), generator/, generator-preview/, icons/, images/, videos/, vini/, vinihtml/.

File aplikasi yang dikelola: index.html, favicon.svg, icons.svg, identity-card-art.webp, robots.txt.

Tidak menyalin: clients/, folder slug-klien lain seperti nadira/, namina.biz.id/, cgi-bin/, php.ini, namina-deploy-check.txt, atau seluruh namina-private/.

Perhatian: salinan file dengan cp bukan operasi atomik. Gunakan waktu akses rendah untuk pembaruan produksi. File lama dapat dipulihkan dari arsip backup file tertimpa atau dari backup penuh cPanel.

## Pemeriksaan sebelum produksi

Di Terminal cPanel, setelah Update from Remote:

    cd /home/namina93/repositories/namina-hosting
    bash scripts/deploy-cpanel-safe.sh --check

Jika muncul error "target marker missing" atau "missing build", **jangan memaksakan**. Periksa konfigurasi terlebih dahulu.

Ketika skrip sudah diuji dan izin deployment produksi diberikan, konfigurasi .cpanel.yml dapat diperbarui secara terpisah agar menjalankan:

    NAMINA_CPANEL_APPROVE_PRODUCTION=YES_DEPLOY_NAMINA bash scripts/deploy-cpanel-safe.sh --apply

**Baris tersebut belum dimasukkan ke .cpanel.yml.** Saat ini cPanel terus melakukan deploy ke staging; aman untuk tes.

## Validasi setelah deploy produksi

Periksa halaman utama, generator login pribadi, tab Isi Data dan Media (Prompt Gambar dan Video), tombol Japri Saya!, /vini/, /nadira/, data clients/*.json, serta proses edit dan publish klien. Jika ada masalah, hentikan deployment selanjutnya dan gunakan arsip rollback di folder privat (jangan melakukan full restore cPanel tanpa koordinasi dengan provider).

Untuk upgrade selanjutnya, ulangi: edit di GitHub → build hosting & test → Update from Remote → preflight → Deploy HEAD Commit. Tidak memerlukan FTPS maupun ZIP manual.
