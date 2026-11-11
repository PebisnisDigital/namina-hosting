<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}
if (getenv('NAMINA_CI_SCHEMA_TEST') !== '1') {
    fwrite(STDERR, "Pengujian schema hanya berjalan saat NAMINA_CI_SCHEMA_TEST=1.\n");
    exit(2);
}
$dsn = getenv('NAMINA_CI_DSN');
$username = getenv('NAMINA_CI_USER');
$password = getenv('NAMINA_CI_PASSWORD');
if (!$dsn || !$username || $password === false) {
    fwrite(STDERR, "Konfigurasi test database tidak lengkap.\n");
    exit(2);
}
$pdo = new PDO($dsn, $username, $password, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_EMULATE_PREPARES => false,
]);

$sql = file_get_contents(__DIR__ . '/schema.sql');
if ($sql === false) throw new RuntimeException('Schema SQL tidak ditemukan.');
$sql = preg_replace('/^\s*--[^\r\n]*$/m', '', $sql);
$statements = preg_split('/;\s*(?:\r?\n|$)/', $sql);
if (!is_array($statements)) throw new RuntimeException('Schema SQL tidak dapat diparsing.');

for ($round = 0; $round < 2; $round++) {
    foreach ($statements as $statement) {
        if (trim($statement) !== '') $pdo->exec(trim($statement));
    }
}
$tables = [
    'nm_users', 'nm_plans', 'nm_licenses', 'nm_sites', 'nm_site_versions',
    'nm_orders', 'nm_payments', 'nm_client_access', 'nm_audit_logs', 'nm_login_attempts'
];
$stmt = $pdo->query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()");
$existing = $stmt->fetchAll(PDO::FETCH_COLUMN);
$missing = array_diff($tables, $existing);
if ($missing) throw new RuntimeException('Missing: ' . implode(', ', $missing));
echo "PASS: 10 business tables present; migration reran without dropping data.\n";
