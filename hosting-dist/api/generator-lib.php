<?php
declare(strict_types=1);

// Runtime PHP only: no Node.js process, database, or third-party API keys.
function nm_data_dir(): string {
    $custom = getenv('NAMINA_PRIVATE_DIR');
    return is_string($custom) && $custom !== '' ? rtrim($custom, '/') : dirname(__DIR__, 2) . '/namina-private';
}

function nm_public_dir(): string { return dirname(__DIR__); }

function nm_file(string $name): string { return nm_data_dir() . '/' . $name; }

function nm_read_json(string $path): ?array {
    if (!is_file($path)) return null;
    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : null;
}

function nm_save_json(string $path, array $data, bool $public = false): void {
    $dir = dirname($path);
    if (!is_dir($dir) && !mkdir($dir, $public ? 0755 : 0700, true) && !is_dir($dir)) throw new RuntimeException('Direktori penyimpanan gagal dibuat.');
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT);
    $temp = tempnam($dir, '.namina-');
    if ($temp === false || file_put_contents($temp, $json, LOCK_EX) === false) throw new RuntimeException('Gagal menyimpan data.');
    chmod($temp, $public ? 0644 : 0600);
    if (!rename($temp, $path)) throw new RuntimeException('Gagal menyelesaikan penyimpanan.');
}

function nm_lock(callable $callback): mixed {
    $dir = nm_data_dir();
    if (!is_dir($dir)) throw new RuntimeException('Generator belum diinisialisasi.');
    $lock = fopen(nm_file('.write.lock'), 'c');
    if (!$lock || !flock($lock, LOCK_EX)) throw new RuntimeException('Penyimpanan sedang sibuk.');
    try { return $callback(); }
    finally { flock($lock, LOCK_UN); fclose($lock); }
}

function nm_token_hash(string $token): string { return hash('sha256', $token); }

function nm_token(): string { return bin2hex(random_bytes(32)); }

function nm_slug_ok(string $slug): bool {
    $reserved = ['admin','api','login','logout','dashboard','studio','generator','generator-preview','client','preview','assets','auth','settings','checkout','register','help','www','new','demo','canvas','privacy','terms','support','gaya','templates','formulir','vini','vinihtml'];
    return (bool) preg_match('/^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/D', $slug)
        && !in_array($slug, $reserved, true) && !preg_match('/^gaya(?:[1-9]|1[0-6])$/D', $slug);
}

function nm_site_path(string $slug): string { return nm_file('sites/' . $slug . '.json'); }

function nm_list_sites(): array {
    $files = glob(nm_file('sites/*.json')) ?: [];
    $rows = [];
    foreach ($files as $file) {
        $entry = nm_read_json($file);
        if (!is_array($entry)) continue;
        $rows[] = [
            'slug' => $entry['slug'], 'policy' => $entry['policy'],
            'revision' => $entry['revision'], 'publishedRevision' => $entry['publishedRevision'],
            'pendingRevision' => $entry['pendingRevision'], 'updatedAt' => $entry['updatedAt'],
        ];
    }
    usort($rows, fn($a, $b) => strcmp($a['slug'], $b['slug']));
    return $rows;
}

function nm_actor(string $bearer): array {
    $config = nm_read_json(nm_file('config.json'));
    if (!$config || !isset($config['adminHash'])) throw new RuntimeException('Generator belum diinisialisasi.', 503);
    if ($bearer === '' || !preg_match('/^[a-f0-9]{64}$/D', $bearer)) throw new RuntimeException('Link editor tidak valid.', 401);
    $hash = nm_token_hash($bearer);
    if (hash_equals((string) $config['adminHash'], $hash)) return ['role' => 'admin'];
    foreach (glob(nm_file('sites/*.json')) ?: [] as $file) {
        $site = nm_read_json($file);
        if (is_array($site) && hash_equals((string) ($site['accessHash'] ?? ''), $hash)) {
            return ['role' => 'client', 'slug' => $site['slug']];
        }
    }
    throw new RuntimeException('Link editor tidak berlaku. Minta link baru kepada admin NAMINA.', 403);
}

function nm_require_admin(array $actor): void {
    if ($actor['role'] !== 'admin') throw new RuntimeException('Hanya admin yang dapat melakukan ini.', 403);
}

function nm_get_site(string $slug, array $actor): array {
    if (!nm_slug_ok($slug)) throw new RuntimeException('Alamat klien tidak valid.', 400);
    if ($actor['role'] !== 'admin' && $actor['slug'] !== $slug) throw new RuntimeException('Akses klien lain ditolak.', 403);
    $site = nm_read_json(nm_site_path($slug));
    if (!$site) throw new RuntimeException('Website klien belum ditemukan.', 404);
    unset($site['accessHash']);
    if ($actor['role'] !== 'admin') unset($site['brief']);
    return $site;
}

function nm_https_url(mixed $value, bool $allowEmpty = true): bool {
    if (!is_string($value) || strlen($value) > 2000) return false;
    if ($allowEmpty && $value === '') return true;
    if (preg_match('/[\x00-\x20\x7f]/', $value)) return false;
    if (preg_match('#^/(?:videos/[a-zA-Z0-9._-]+|media/[a-z0-9-]{3,48}/[a-f0-9]{32}\.(?:png|jpg|webp))$#D', $value)) return true;
    $parts = parse_url($value);
    return is_array($parts) && ($parts['scheme'] ?? '') === 'https' && !empty($parts['host']) && !isset($parts['user']) && !isset($parts['pass']);
}

function nm_safe_card_link(mixed $value): bool {
    if (!is_string($value) || strlen($value) > 500 || preg_match('/[\x00-\x20\x7f]/', $value)) return false;
    if ($value === '') return true;
    if (str_starts_with($value, 'https://')) return nm_https_url($value, false);
    if (str_starts_with($value, 'mailto:')) return (bool) preg_match('/^mailto:[^\s@]+@[^\s@]+$/D', $value);
    if (str_starts_with($value, 'tel:')) return (bool) preg_match('/^tel:[+0-9()\-]+$/D', $value);
    return false;
}

function nm_short_text(mixed $value, int $maxChars, bool $required = false): bool {
    return is_string($value) && strlen($value) <= $maxChars * 4 && (!$required || trim($value) !== '');
}

function nm_validate_document(mixed $doc, string $slug): array {
    if (!is_array($doc) || ($doc['slug'] ?? null) !== $slug) throw new RuntimeException('Data halaman tidak sesuai dengan klien.', 422);
    if (strlen((string) json_encode($doc)) > 180000) throw new RuntimeException('Data halaman terlalu besar.', 413);
    $content = $doc['content'] ?? null;
    $media = $doc['media'] ?? null;
    if (!is_array($content) || !is_array($media) || ($content['template'] ?? null) !== 'ORIGINAL' || ($content['schemaVersion'] ?? null) !== 1) {
        throw new RuntimeException('Format template Original tidak valid.', 422);
    }
    if (!is_array($content['identity'] ?? null) || !nm_short_text($content['identity']['displayName'] ?? null, 60, true)) {
        throw new RuntimeException('Nama klien wajib diisi.', 422);
    }
    if (!nm_short_text($content['identity']['profession'] ?? null, 70) || !nm_short_text($content['identity']['bio'] ?? null, 300)) {
        throw new RuntimeException('Identitas klien terlalu panjang.', 422);
    }
    if (!is_array($content['cards'] ?? null) || count($content['cards']) < 1 || count($content['cards']) > 24) {
        throw new RuntimeException('Jumlah kartu identitas tidak valid.', 422);
    }
    $visible = false;
    foreach ($content['cards'] as $card) {
        if (!is_array($card) || !nm_short_text($card['title'] ?? null, 48, true)
            || !nm_short_text($card['subtitle'] ?? null, 100)
            || !nm_short_text($card['description'] ?? null, 1200)
            || !is_bool($card['visible'] ?? null) || !nm_safe_card_link($card['link'] ?? '')) {
            throw new RuntimeException('Data kartu identitas tidak valid.', 422);
        }
        $visible = $visible || $card['visible'];
    }
    if (!$visible) throw new RuntimeException('Minimal satu kartu harus terlihat.', 422);
    $original = $content['original'] ?? null;
    if (!is_array($original) || !is_array($original['nama'] ?? null)) throw new RuntimeException('Data Original belum lengkap.', 422);
    foreach (['nama', 'karir', 'skill', 'karya', 'produk'] as $section) {
        if (!is_array($original[$section]['items'] ?? null)) throw new RuntimeException('Isi menu ' . $section . ' tidak valid.', 422);
        if (count($original[$section]['items']) > 30) throw new RuntimeException('Terlalu banyak data pada menu ' . $section . '.', 422);
        foreach (['intro' => 120, 'subtitle' => 100, 'description' => 400] as $field => $max) {
            if (!nm_short_text($original[$section][$field] ?? null, $max)) throw new RuntimeException('Teks pada menu ' . $section . ' terlalu panjang.', 422);
        }
        foreach ($original[$section]['items'] as $item) {
            if (!is_array($item) || !is_string($item['id'] ?? null)) throw new RuntimeException('Item menu tidak valid.', 422);
            if (in_array($section, ['nama', 'karir', 'skill'], true)) {
                if (!nm_short_text($item['label'] ?? null, 40, true) || !nm_short_text($item['value'] ?? null, 180)
                    || !is_int($item['icon'] ?? null) || $item['icon'] <= 0) {
                    throw new RuntimeException('Data slide ' . $section . ' tidak valid.', 422);
                }
            } elseif (!nm_short_text($item['title'] ?? null, 80, true)
                || !nm_short_text($item['description'] ?? null, 1200)
                || !nm_https_url($item['link'] ?? null)) {
                throw new RuntimeException('Data galeri ' . $section . ' tidak valid.', 422);
            }
        }
    }
    foreach (['desktopVideo', 'mobileVideo', 'poster', 'portrait', 'enterKey'] as $field) {
        if (!nm_https_url($media[$field] ?? '')) throw new RuntimeException('Link ' . $field . ' tidak valid.', 422);
    }
    if (!is_array($media['cards'] ?? null)) throw new RuntimeException('Format link kartu tidak valid.', 422);
    foreach ($media['cards'] as $url) if (!nm_https_url($url)) throw new RuntimeException('Link gambar harus HTTPS.', 422);
    $contact = $original['contactUrl'] ?? '';
    if (!is_string($contact) || ($contact !== '' && !nm_https_url($contact))) throw new RuntimeException('Link kontak harus HTTPS.', 422);
    return $doc;
}

function nm_publish(string $slug, array $doc): void {
    $public = nm_public_dir();
    $source = $public . '/client/index.html';
    if (!is_file($source)) throw new RuntimeException('Template hosting belum dibangun. Jalankan build terlebih dulu.', 503);
    $html = str_replace('NAMINA_SITE_SLUG_PLACEHOLDER', htmlspecialchars($slug, ENT_QUOTES, 'UTF-8'), (string) file_get_contents($source));
    $folder = $public . '/' . $slug;
    if (!is_dir($folder) && !mkdir($folder, 0755, true)) throw new RuntimeException('Folder website gagal dibuat.');
    $index = $folder . '/index.html';
    $temp = tempnam($folder, '.site-');
    if (!$temp || file_put_contents($temp, $html) === false || !rename($temp, $index)) throw new RuntimeException('Gagal menulis halaman HTML.');
    nm_save_json($public . '/clients/' . $slug . '.json', $doc, true);
}

function nm_zip(string $slug, array $doc): string {
    if (!class_exists('ZipArchive')) throw new RuntimeException('Ekstensi PHP ZipArchive perlu diaktifkan di cPanel.', 503);
    $public = nm_public_dir();
    $source = $public . '/client/index.html';
    if (!is_file($source)) throw new RuntimeException('Build hosting belum tersedia.', 503);
    $filename = tempnam(sys_get_temp_dir(), 'namina-');
    if (!$filename) throw new RuntimeException('Gagal membuat paket unduh.');
    $zip = new ZipArchive();
    if ($zip->open($filename, ZipArchive::OVERWRITE) !== true) throw new RuntimeException('Paket ZIP gagal dibuat.');
    $zip->addFromString('index.html', str_replace('NAMINA_SITE_SLUG_PLACEHOLDER', $slug, (string) file_get_contents($source)));
    $zip->addFromString('clients/' . $slug . '.json', json_encode($doc, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    foreach (['assets', 'animated-icons', 'icons', 'images', 'videos'] as $dir) {
        if (!is_dir($public . '/' . $dir)) continue;
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($public . '/' . $dir, FilesystemIterator::SKIP_DOTS));
        foreach ($iterator as $file) {
            if (!$file->isFile()) continue;
            $relative = substr($file->getPathname(), strlen($public) + 1);
            $zip->addFile($file->getPathname(), $relative);
        }
    }
    foreach (['favicon.svg', 'icons.svg', 'identity-card-art.webp'] as $name) {
        if (is_file($public . '/' . $name)) $zip->addFile($public . '/' . $name, $name);
    }
    $zip->addFromString('README.txt', "NAMINA: paket HTML untuk satu website.\nUpload isi ZIP ke folder utama (public_html) domain tujuan.\nGambar/video eksternal tetap memakai link HTTPS yang tersimpan di Dropbox.\nPastikan HTTPS aktif untuk autoplay dan pemuatan aset.\n");
    $zip->close();
    return $filename;
}
