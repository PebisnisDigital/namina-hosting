<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require_once __DIR__ . '/generator-lib.php';

$dir = nm_data_dir();
if (is_file(nm_file('config.json'))) {
    fwrite(STDERR, "Konfigurasi sudah ada. Demi keamanan, setup tidak akan menimpa token admin.\n");
    exit(1);
}
if (!is_dir($dir) && !mkdir($dir, 0700, true)) throw new RuntimeException('Direktori privat gagal dibuat.');
chmod($dir, 0700);
if (str_starts_with(realpath($dir) ?: $dir, realpath(nm_public_dir()) ?: nm_public_dir())) {
    throw new RuntimeException('Folder privat harus di luar public_html. Set NAMINA_PRIVATE_DIR terlebih dahulu.');
}
$token = nm_token();
nm_save_json(nm_file('config.json'), ['adminHash' => nm_token_hash($token), 'createdAt' => gmdate('c')]);
echo "NAMINA Generator siap.\n";
echo "ADMIN TOKEN (simpan di pengelola kata sandi, hanya tampil sekali):\n" . $token . "\n";
echo "Link admin: https://DOMAIN-ANDA/generator/#token=" . $token . "\n";
echo "Ganti DOMAIN-ANDA dengan domain HTTPS final. Jangan kirim link admin ke klien.\n";
