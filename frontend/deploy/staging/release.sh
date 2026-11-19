#!/usr/bin/env bash
# Runs on the VPS after two reviewed repositories and their release images are installed.
set -euo pipefail
umask 077
base=/opt/sidnam-devsecops
release="${1:?release ID required}"
[[ "$release" =~ ^[0-9a-f]{12}-[0-9a-f]{12}$ ]] || exit 2
target="$base/releases/$release"
test -d "$target/frontend"
test -d "$target/backend"
test -f "$base/shared/.env.staging"
cd "$target/frontend"
export BACKEND_DIR="$target/backend"
export FRONTEND_IMAGE="sidnam-frontend:$release"
export BACKEND_IMAGE="sidnam-backend:$release"
compose=(docker compose --project-name sidnam-devsecops --env-file "$base/shared/.env.staging" -f deploy/staging/compose.yaml)
"${compose[@]}" config --quiet
mkdir -p "$base/backups"
if "${compose[@]}" exec -T mysql true 2>/dev/null; then
  "${compose[@]}" exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump -u "$MYSQL_USER" --single-transaction --no-tablespaces "$MYSQL_DATABASE"' > "$base/backups/$release-before.sql"
fi
"${compose[@]}" up -d --wait mysql
"${compose[@]}" run --rm --no-deps backend node dist/devsecops/database.js migrate
"${compose[@]}" run --rm --no-deps backend node dist/devsecops/database.js seed
"${compose[@]}" up -d --wait --no-build
curl --fail --silent http://127.0.0.1:8080/api/health >/dev/null
if test -L "$base/current"; then readlink "$base/current" > "$base/previous-release"; fi
ln -sfn "$target" "$base/current"
printf '%s\n' "$release" > "$base/deployed-release"
echo 'Staging release healthy. Run public HTTPS E2E and DAST before accepting delivery.'
