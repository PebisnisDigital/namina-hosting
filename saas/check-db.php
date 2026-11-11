<?php
declare(strict_types=1);

// CLI-only database readiness check. Place this file OUTSIDE public_html.
// No credentials or client data are sent back to the browser.
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}

$configPath = getenv('NAMINA_BUSINESS_CONFIG') ?: __DIR__ . '/config.local.php';
if (!is_file($configPath)) {
    fwrite(STDERR, "Konfigurasi belum tersedia di folder privat. Salin config.example.php menjadi config.local.php.\n");
    exit(2);
}

$config = require $configPath;
if (!is_array($config)) {
    fwrite(STDERR, "Konfigurasi database tidak valid.\n");
    exit(2);
}
foreach (['host', 'port', 'database', 'username', 'password'] as $key) {
    if (!isset($config[$key]) || (!is_int($config[$key]) && !is_string($config[$key]))) {
        fwrite(STDERR, "Konfigurasi database tidak lengkap: {$key}.\n");
        exit(2);
    }
}
if (!extension_loaded('pdo_mysql')) {
    fwrite(STDERR, "Ekstensi pdo_mysql belum tersedia pada PHP CLI.\n");
    exit(2);
}
if (trim((string) $config['database']) === '' || trim((string) $config['username']) === '') {
    fwrite(STDERR, "Nama database atau username belum diisi.\n");
    exit(2);
}

try {
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        (string) $config['host'], (int) $config['port'], (string) $config['database']);
    $db = new PDO($dsn, (string) $config['username'], (string) $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 5,
    ]);
    $db->query('SELECT 1')->fetchColumn();
    $required = [
        'nm_users', 'nm_plans', 'nm_licenses', 'nm_sites', 'nm_site_versions',
        'nm_orders', 'nm_payments', 'nm_client_access', 'nm_audit_logs', 'nm_login_attempts'
    ];
    $statement = $db->query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'nm\\_%'");
    $existing = $statement->fetchAll(PDO::FETCH_COLUMN);
    $missing = array_values(array_diff($required, $existing));
    echo "Koneksi MySQL: BERHASIL\n";
    echo "PDO MySQL: tersedia\n";
    if ($missing) {
        echo "Struktur NAMINA Business: BELUM LENGKAP\n";
        echo "Tabel yang belum ada: " . implode(', ', $missing) . "\n";
        exit(3);
    }
    echo "Struktur NAMINA Business: LENGKAP (" . count($required) . " tabel)\n";
    echo "Catatan: ini hanya uji koneksi/struktur; bukan uji keamanan lintas akun.\n";
} catch (PDOException $error) {
    // Do not dump PDO errors: DSN and server details should remain private.
    fwrite(STDERR, "Koneksi MySQL GAGAL. Periksa host, user, hak akses database, versi PHP, dan firewall.\n");
    exit(1);
}
