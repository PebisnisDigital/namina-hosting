#!/usr/bin/env bash
# NAMINA cPanel production deployment: fixed allowlist, no deletion.
set -euo pipefail
umask 027

mode="$1"
if [[ "$mode" != "--check" && "$mode" != "--apply" ]]; then
  printf 'Usage: bash scripts/deploy-cpanel-safe.sh --check|--apply\n' >&2
  exit 2
fi

repo_root="$(cd "$(dirname "$0")/.." && pwd -P)"
build="$repo_root/hosting-dist"
docroot="/home/namina93/public_html"
private="/home/namina93/namina-private"
if [[ -v NAMINA_CPANEL_FIXTURE_MODE && "$NAMINA_CPANEL_FIXTURE_MODE" == "ci-test" ]]; then
  build="$NAMINA_TEST_BUILD"
  docroot="$NAMINA_TEST_DOCROOT"
  private="$NAMINA_TEST_PRIVATE"
fi

if [[ ! -d "$build" || ! -d "$docroot" || ! -d "$private" ]]; then
  printf 'REFUSED: build, public_html, or private directory is missing.\n' >&2
  exit 1
fi
for required in index.html generator/index.html api/generator.php api/generator-lib.php api/.htaccess; do
  if [[ ! -f "$build/$required" ]]; then
    printf 'REFUSED: missing required build path: %s\n' "$required" >&2
    exit 1
  fi
done
if [[ -L "$build" || -L "$docroot" || -L "$private" ]]; then
  printf 'REFUSED: root directory must not be a symbolic link.\n' >&2
  exit 1
fi
if [[ ! -f "$docroot/namina-deploy-check.txt" ]] ||
   ! grep -Fxq 'NAMINA-DEPLOY-TARGET' "$docroot/namina-deploy-check.txt"; then
  printf 'REFUSED: production target marker missing or wrong.\n' >&2
  exit 1
fi

# ONLY these managed app paths are replaced. Published client pages and
# /clients/*.json, php.ini, namina.biz.id, cgi-bin, private data stay untouched.
folders="animated-icons api assets client generator generator-preview icons images videos vini vinihtml"
files="index.html favicon.svg icons.svg identity-card-art.webp robots.txt"

for entry in $folders $files; do
  [[ -e "$build/$entry" ]] || continue
  if [[ -n "$(find "$build/$entry" -type l -print -quit)" ]]; then
    printf 'REFUSED: source contains symlink: %s\n' "$entry" >&2
    exit 1
  fi
  if [[ -L "$docroot/$entry" ]]; then
    printf 'REFUSED: destination is symlink: %s\n' "$entry" >&2
    exit 1
  fi
  if [[ -d "$docroot/$entry" && -n "$(find "$docroot/$entry" -type l -print -quit)" ]]; then
    printf 'REFUSED: destination contains symlink: %s\n' "$entry" >&2
    exit 1
  fi
done

printf 'Preflight passed. Destination: %s\n' "$docroot"
printf 'Included directories: %s\n' "$folders"
printf 'Included files: %s\n' "$files"
printf 'Excluded: clients/, client slugs (e.g. nadira/), php.ini, private config, cgi-bin.\n'
printf 'Deletion operations: NONE.\n'

if [[ "$mode" == "--check" ]]; then
  printf 'CHECK ONLY: no production files changed.\n'
  exit 0
fi
if [[ ! -v NAMINA_CPANEL_APPROVE_PRODUCTION || "$NAMINA_CPANEL_APPROVE_PRODUCTION" != "YES_DEPLOY_NAMINA" ]]; then
  printf 'REFUSED: production deployment approval missing.\n' >&2
  exit 1
fi

backup_root="$private/deploy-backups"
mkdir -p "$backup_root"
chmod 0700 "$backup_root"
backup_dir="$(mktemp -d "$backup_root/release-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")"
chmod 0700 "$backup_dir"
list="$(mktemp)"
paths="$(mktemp)"
trap 'rm -f "$list" "$paths"' EXIT

# Archive only existing files that could be overwritten.
for entry in $files; do
  if [[ -f "$build/$entry" && -f "$docroot/$entry" ]]; then
    printf '%s\0' "$entry" >> "$list"
  fi
done
for entry in $folders; do
  [[ -d "$build/$entry" ]] || continue
  # cPanel Git deploy executes tasks without /dev/fd process-substitution support.
  # Use a real temporary file and verify find succeeds before any deployment.
  (cd "$build" && find "$entry" -type f -print0 > "$paths")
  while IFS= read -r -d '' relative; do
    if [[ -f "$docroot/$relative" ]]; then
      printf '%s\0' "$relative" >> "$list"
    fi
  done < "$paths"
done
if [[ -s "$list" ]]; then
  tar -C "$docroot" --null -czf "$backup_dir/overwritten-files.tar.gz" -T "$list"
else
  : > "$backup_dir/no-existing-overwrites.txt"
fi

for entry in $folders; do
  [[ -d "$build/$entry" ]] || continue
  mkdir -p "$docroot/$entry"
  cp -R "$build/$entry/." "$docroot/$entry/"
done
for entry in $files; do
  [[ -f "$build/$entry" ]] || continue
  cp "$build/$entry" "$docroot/$entry"
done
printf 'NAMINA release copied without deletions. Backup: %s\n' "$backup_dir"
