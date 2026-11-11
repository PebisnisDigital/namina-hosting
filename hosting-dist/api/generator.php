<?php
declare(strict_types=1);
require_once __DIR__ . '/generator-lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');
header('Content-Security-Policy: frame-ancestors \'none\'');

function nm_reply(array $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

function nm_body(): array {
    $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > 220000) throw new RuntimeException('Permintaan terlalu besar.', 413);
    $raw = file_get_contents('php://input', false, null, 0, 220001);
    if ($raw === false || strlen($raw) > 220000) throw new RuntimeException('Permintaan terlalu besar.', 413);
    $data = json_decode($raw, true);
    if (!is_array($data)) throw new RuntimeException('Format JSON tidak valid.', 400);
    return $data;
}

function nm_expected(array $body, array $site): void {
    if (!isset($body['expectedRevision']) || !is_int($body['expectedRevision']) || $body['expectedRevision'] !== $site['revision']) {
        throw new RuntimeException('Draft berubah di perangkat lain. Muat ulang sebelum melanjutkan.', 409);
    }
}

try {
    if (!is_file(nm_file('config.json'))) throw new RuntimeException('Generator belum diinisialisasi. Buka panduan setup di repository.', 503);
    if (($_SERVER['HTTPS'] ?? '') !== 'on' && ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') !== 'https'
        && !in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)) {
        throw new RuntimeException('Generator hanya tersedia melalui HTTPS.', 403);
    }
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($auth === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $key => $value) {
            if (strcasecmp($key, 'Authorization') === 0) $auth = (string) $value;
        }
    }
    if (!preg_match('/^Bearer ([a-f0-9]{64})$/D', $auth, $match)) throw new RuntimeException('Masukkan link editor pribadi yang valid.', 401);
    $actor = nm_actor($match[1]);
    $action = (string) ($_GET['action'] ?? 'session');
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($action === 'session' && $method === 'GET') {
        if ($actor['role'] === 'admin') nm_reply(['role' => 'admin', 'clients' => nm_list_sites()]);
        nm_reply(['role' => 'client', 'slug' => $actor['slug']]);
    }

    if ($action === 'site' && $method === 'GET') {
        $slug = (string) ($_GET['slug'] ?? ($actor['slug'] ?? ''));
        nm_reply(['site' => nm_get_site($slug, $actor)]);
    }

    if ($action === 'create' && $method === 'POST') {
        nm_require_admin($actor);
        $body = nm_body();
        $slug = (string) ($body['slug'] ?? '');
        $policy = (string) ($body['policy'] ?? 'approval');
        if (!nm_slug_ok($slug)) throw new RuntimeException('Alamat website tidak valid atau sudah dipakai sistem.', 422);
        if (!in_array($policy, ['self', 'approval'], true)) throw new RuntimeException('Izin publish tidak valid.', 422);
        $doc = nm_validate_document($body['document'] ?? null, $slug);
        $brief = (string) ($body['brief'] ?? '');
        if (strlen($brief) > 10000) throw new RuntimeException('Brief terlalu panjang.', 422);
        $clientToken = nm_token();
        nm_lock(function () use ($slug, $policy, $doc, $brief, $clientToken) {
            if (is_file(nm_site_path($slug)) || is_dir(nm_public_dir() . '/' . $slug)) throw new RuntimeException('Slug sudah digunakan.', 409);
            nm_save_json(nm_site_path($slug), [
                'slug' => $slug, 'policy' => $policy, 'accessHash' => nm_token_hash($clientToken),
                'document' => $doc, 'brief' => $brief, 'revision' => 1,
                'publishedRevision' => 0, 'pendingRevision' => null, 'updatedAt' => gmdate('c'),
            ]);
        });
        // Raw token is returned exactly once. It is never stored in public files.
        nm_reply(['ok' => true, 'token' => $clientToken, 'slug' => $slug], 201);
    }

    if ($action === 'save' && $method === 'POST') {
        $body = nm_body();
        $slug = (string) ($body['slug'] ?? '');
        $doc = nm_validate_document($body['document'] ?? null, $slug);
        $updated = nm_lock(function () use ($body, $slug, $doc, $actor) {
            nm_get_site($slug, $actor);
            $site = nm_read_json(nm_site_path($slug));
            nm_expected($body, $site);
            $site['document'] = $doc;
            $site['revision']++;
            $site['pendingRevision'] = null;
            $site['updatedAt'] = gmdate('c');
            nm_save_json(nm_site_path($slug), $site);
            return $site['revision'];
        });
        nm_reply(['ok' => true, 'revision' => $updated]);
    }

    if ($action === 'publish' && $method === 'POST') {
        $body = nm_body();
        $slug = (string) ($body['slug'] ?? '');
        $outcome = nm_lock(function () use ($body, $slug, $actor) {
            nm_get_site($slug, $actor);
            $site = nm_read_json(nm_site_path($slug));
            nm_expected($body, $site);
            if ($actor['role'] === 'admin' || $site['policy'] === 'self') {
                nm_publish($slug, nm_validate_document($site['document'], $slug));
                $site['publishedRevision'] = $site['revision'];
                $site['pendingRevision'] = null;
                $status = 'published';
            } else {
                $site['pendingRevision'] = $site['revision'];
                $status = 'pending';
            }
            $site['updatedAt'] = gmdate('c');
            nm_save_json(nm_site_path($slug), $site);
            return $status;
        });
        nm_reply(['ok' => true, 'status' => $outcome]);
    }

    if ($action === 'review' && $method === 'POST') {
        nm_require_admin($actor);
        $body = nm_body();
        $slug = (string) ($body['slug'] ?? '');
        $decision = (string) ($body['decision'] ?? '');
        if (!in_array($decision, ['approve', 'reject'], true)) throw new RuntimeException('Keputusan tidak valid.', 422);
        nm_lock(function () use ($body, $slug, $decision) {
            if (!nm_slug_ok($slug)) throw new RuntimeException('Slug tidak valid.', 422);
            $site = nm_read_json(nm_site_path($slug));
            if (!$site) throw new RuntimeException('Klien tidak ditemukan.', 404);
            nm_expected($body, $site);
            if ($site['pendingRevision'] !== $site['revision']) throw new RuntimeException('Tidak ada revisi menunggu persetujuan.', 409);
            if ($decision === 'approve') {
                nm_publish($slug, nm_validate_document($site['document'], $slug));
                $site['publishedRevision'] = $site['revision'];
            }
            $site['pendingRevision'] = null;
            $site['updatedAt'] = gmdate('c');
            nm_save_json(nm_site_path($slug), $site);
        });
        nm_reply(['ok' => true, 'status' => $decision === 'approve' ? 'published' : 'rejected']);
    }

    if ($action === 'policy' && $method === 'POST') {
        nm_require_admin($actor);
        $body = nm_body();
        $slug = (string) ($body['slug'] ?? '');
        if (!in_array($body['policy'] ?? null, ['self', 'approval'], true)) throw new RuntimeException('Izin publish tidak valid.', 422);
        nm_lock(function () use ($body, $slug) {
            if (!nm_slug_ok($slug)) throw new RuntimeException('Slug tidak valid.', 422);
            $site = nm_read_json(nm_site_path($slug));
            if (!$site) throw new RuntimeException('Klien tidak ditemukan.', 404);
            $site['policy'] = $body['policy'];
            $site['updatedAt'] = gmdate('c');
            nm_save_json(nm_site_path($slug), $site);
        });
        nm_reply(['ok' => true]);
    }

    if ($action === 'rotate' && $method === 'POST') {
        nm_require_admin($actor);
        $body = nm_body();
        $slug = (string) ($body['slug'] ?? '');
        $token = nm_token();
        nm_lock(function () use ($slug, $token) {
            if (!nm_slug_ok($slug)) throw new RuntimeException('Slug tidak valid.', 422);
            $site = nm_read_json(nm_site_path($slug));
            if (!$site) throw new RuntimeException('Klien tidak ditemukan.', 404);
            $site['accessHash'] = nm_token_hash($token);
            nm_save_json(nm_site_path($slug), $site);
        });
        nm_reply(['ok' => true, 'token' => $token]);
    }

    if ($action === 'download' && $method === 'POST') {
        $body = nm_body();
        $slug = (string) ($body['slug'] ?? '');
        $site = nm_get_site($slug, $actor);
        $doc = nm_validate_document($site['document'], $slug);
        $zip = nm_zip($slug, $doc);
        header_remove('Content-Type');
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="namina-' . $slug . '.zip"');
        header('Content-Length: ' . filesize($zip));
        readfile($zip);
        unlink($zip);
        exit;
    }

    throw new RuntimeException('Aksi tidak ditemukan.', 404);
} catch (Throwable $error) {
    $status = $error->getCode();
    if (!is_int($status) || $status < 400 || $status > 599) $status = 500;
    error_log('NAMINA generator: ' . $error->getMessage());
    nm_reply(['error' => $status === 500 ? 'Ada kendala server. Hubungi admin NAMINA.' : $error->getMessage()], $status);
}
