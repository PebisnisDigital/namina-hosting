#!/usr/bin/env bash
set -euo pipefail

# Upload only the tested static/PHP build over explicit FTPS (AUTH TLS).
# Never delete remote files: published client JSON/pages live on the server.
source_dir="${1:-hosting-dist}"
for variable in NAMINA_FTPS_HOST NAMINA_FTPS_PORT NAMINA_FTPS_USER NAMINA_FTPS_PASSWORD; do
  if [[ -z "${!variable:-}" ]]; then
    printf 'Missing GitHub Actions secret: %s\n' "$variable" >&2
    exit 1
  fi
done

if [[ ! -d "$source_dir" || ! -f "$source_dir/index.html" || ! -f "$source_dir/api/generator.php" ]]; then
  printf 'Website build is incomplete; deployment refused.\n' >&2
  exit 1
fi
if [[ ! "$NAMINA_FTPS_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]]; then
  printf 'Invalid NAMINA_FTPS_HOST. Use the verified TLS hostname, not a URL.\n' >&2
  exit 1
fi
if [[ ! "$NAMINA_FTPS_PORT" =~ ^[0-9]{1,5}$ ]] ||
   (( 10#$NAMINA_FTPS_PORT < 1 || 10#$NAMINA_FTPS_PORT > 65535 )); then
  printf 'Invalid NAMINA_FTPS_PORT. Explicit FTPS normally uses port 21.\n' >&2
  exit 1
fi
if [[ -n "$(find "$source_dir" -type l -print -quit)" ]]; then
  printf 'Build contains symlinks; deployment refused.\n' >&2
  exit 1
fi
if ! command -v lftp >/dev/null 2>&1; then
  printf 'lftp is required on the GitHub runner.\n' >&2
  exit 1
fi

# The dedicated FTP account must be restricted to public_html, so its FTP /
# maps to the webroot. This marker prevents accidental uploads elsewhere.
stage_dir="$(mktemp -d)"
marker_result="$(mktemp)"
trap 'rm -rf -- "$stage_dir"; rm -f -- "$marker_result"' EXIT

ftps_options=(-u "$NAMINA_FTPS_USER,$NAMINA_FTPS_PASSWORD" -p "$NAMINA_FTPS_PORT" "ftp://$NAMINA_FTPS_HOST")

# First check TLS and a hand-created marker in public_html. Never downgrade
# encryption or disable certificate verification to make a deploy pass.
if ! timeout -k 5s 60s lftp "${ftps_options[@]}" > "$marker_result" <<'LFTP'
set cmd:fail-exit true
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ftp:passive-mode true
set ssl:verify-certificate true
set ssl:check-hostname true
set net:max-retries 2
set net:timeout 30
cat namina-deploy-check.txt
bye
LFTP
then
  printf 'FTPS preflight failed. Check the TLS certificate, FTP hostname, credentials, and deploy marker.\n' >&2
  exit 1
fi
if ! grep -Fxq 'NAMINA-DEPLOY-TARGET' "$marker_result"; then
  printf 'FTPS target check failed. Create namina-deploy-check.txt containing NAMINA-DEPLOY-TARGET in public_html.\n' >&2
  exit 1
fi

# The source-controlled Vini demo is the only client record allowed in the
# upload. Customer-generated records remain untouched on the server.
find "$source_dir" -mindepth 1 -maxdepth 1 ! -name clients \
  -exec cp -a -- '{}' "$stage_dir/" \;
if [[ -f "$source_dir/clients/vini.json" ]]; then
  mkdir -p "$stage_dir/clients"
  cp -a -- "$source_dir/clients/vini.json" "$stage_dir/clients/vini.json"
fi

# lftp mirror -R uploads or updates files; it never prunes without --delete.
timeout -k 10s 540s lftp "${ftps_options[@]}" <<LFTP
set cmd:fail-exit true
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ftp:passive-mode true
set ssl:verify-certificate true
set ssl:check-hostname true
set net:max-retries 2
set net:timeout 30
mirror -R --no-perms --parallel=2 --verbose=1 "$stage_dir" /
bye
LFTP

printf 'Website deployed over verified FTPS. Existing client records and published pages were preserved.\n'
