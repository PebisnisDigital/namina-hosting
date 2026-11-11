-- NAMINA Business / tahap fondasi. Hanya tabel baru; tidak mengubah generator JSON yang aktif.
-- Jalankan pada database MySQL/MariaDB khusus NAMINA setelah backup dan pemeriksaan konfigurasi.
-- Jangan menaruh file ini atau konfigurasi database di public_html.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS nm_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  whatsapp VARCHAR(24) NOT NULL DEFAULT '',
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('superadmin','mitra','client') NOT NULL DEFAULT 'mitra',
  status ENUM('pending','active','suspended') NOT NULL DEFAULT 'pending',
  email_verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_nm_users_email (email),
  KEY ix_nm_users_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nm_plans (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(80) NOT NULL,
  active_site_limit INT UNSIGNED NOT NULL DEFAULT 0,
  draft_limit INT UNSIGNED NOT NULL DEFAULT 0,
  price_idr BIGINT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_nm_plans_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nm_licenses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  plan_id SMALLINT UNSIGNED NOT NULL,
  extra_site_slots INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('pending','active','suspended','revoked') NOT NULL DEFAULT 'pending',
  activated_at DATETIME NULL,
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_nm_license_user (user_id),
  CONSTRAINT fk_nm_license_user FOREIGN KEY (user_id) REFERENCES nm_users(id),
  CONSTRAINT fk_nm_license_plan FOREIGN KEY (plan_id) REFERENCES nm_plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nm_sites (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  client_user_id BIGINT UNSIGNED NULL,
  slug VARCHAR(60) NOT NULL,
  display_name VARCHAR(160) NOT NULL,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_nm_sites_slug (slug),
  KEY ix_nm_sites_owner_status (owner_user_id, status),
  CONSTRAINT fk_nm_site_owner FOREIGN KEY (owner_user_id) REFERENCES nm_users(id),
  CONSTRAINT fk_nm_site_client FOREIGN KEY (client_user_id) REFERENCES nm_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nm_site_versions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  revision_no INT UNSIGNED NOT NULL,
  document_json JSON NOT NULL,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_nm_site_revision (site_id, revision_no),
  CONSTRAINT fk_nm_version_site FOREIGN KEY (site_id) REFERENCES nm_sites(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nm_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_code VARCHAR(40) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  plan_id SMALLINT UNSIGNED NOT NULL,
  amount_idr BIGINT UNSIGNED NOT NULL,
  status ENUM('unpaid','pending_review','paid','rejected','cancelled') NOT NULL DEFAULT 'unpaid',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_nm_order_code (order_code),
  KEY ix_nm_orders_user_status (user_id, status),
  CONSTRAINT fk_nm_order_user FOREIGN KEY (user_id) REFERENCES nm_users(id),
  CONSTRAINT fk_nm_order_plan FOREIGN KEY (plan_id) REFERENCES nm_plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nm_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  method ENUM('bank_transfer','qris') NOT NULL,
  amount_idr BIGINT UNSIGNED NOT NULL,
  proof_private_path VARCHAR(255) NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_nm_payments_order_status (order_id, status),
  CONSTRAINT fk_nm_payment_order FOREIGN KEY (order_id) REFERENCES nm_orders(id),
  CONSTRAINT fk_nm_payment_admin FOREIGN KEY (reviewed_by) REFERENCES nm_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nm_client_access (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  can_publish TINYINT(1) NOT NULL DEFAULT 0,
  expires_at DATETIME NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_nm_client_access_hash (token_hash),
  KEY ix_nm_client_access_site (site_id),
  CONSTRAINT fk_nm_client_access_site FOREIGN KEY (site_id) REFERENCES nm_sites(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nm_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  site_id BIGINT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  detail_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_nm_audit_actor_time (actor_user_id, created_at),
  KEY ix_nm_audit_site_time (site_id, created_at),
  CONSTRAINT fk_nm_audit_user FOREIGN KEY (actor_user_id) REFERENCES nm_users(id),
  CONSTRAINT fk_nm_audit_site FOREIGN KEY (site_id) REFERENCES nm_sites(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nm_login_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email_hash CHAR(64) NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  succeeded TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_nm_attempts_email_time (email_hash, created_at),
  KEY ix_nm_attempts_ip_time (ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
