#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

STAGING_DIR="${1:-}"
MODE="${2:-apply}"
CONFIG_FILE="${READ_BUDDY_RELEASE_CONFIG:-/home/gochi/read_buddy/release.env}"
BACKUP_COMMAND="${READ_BUDDY_BACKUP_COMMAND:-/home/gochi/read_buddy/bin/backup-database}"

if [[ "$MODE" != "apply" && "$MODE" != "status" ]]; then
  echo "ERROR: mode must be apply or status" >&2
  exit 1
fi
if [[ ! -r "$CONFIG_FILE" ]]; then
  echo "ERROR: release configuration is not readable: $CONFIG_FILE" >&2
  exit 1
fi

# shellcheck source=/dev/null
source "$CONFIG_FILE"

: "${POSTGRES_CONTAINER:?POSTGRES_CONTAINER is required}"
: "${POSTGRES_DATABASE:?POSTGRES_DATABASE is required}"
: "${MIGRATION_ROLE:?MIGRATION_ROLE is required}"
: "${DATABASE_MAINTENANCE_LOCK_FILE:?DATABASE_MAINTENANCE_LOCK_FILE is required}"
: "${MIGRATION_LOCK_WAIT_SECONDS:?MIGRATION_LOCK_WAIT_SECONDS is required}"
: "${RELEASE_STAGING_ROOT:?RELEASE_STAGING_ROOT is required}"
: "${BUNDLE_HMAC_KEY_FILE:?BUNDLE_HMAC_KEY_FILE is required}"

STAGING_DIR="$(realpath "$STAGING_DIR")"
RELEASE_STAGING_ROOT="$(realpath "$RELEASE_STAGING_ROOT")"
release_sha="$(basename "$STAGING_DIR")"
staging_parent="$(dirname "$STAGING_DIR")"
if [[ ! -d "$STAGING_DIR" || ! -f "$STAGING_DIR/migrations.tgz" || \
  ! -f "$STAGING_DIR/migrations.hmac" || \
  "$staging_parent" != "$RELEASE_STAGING_ROOT" || \
  ! "$release_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "ERROR: bundle must be a commit-addressed release staging directory" >&2
  exit 1
fi
if [[ ! -r "$BUNDLE_HMAC_KEY_FILE" ]]; then
  echo "ERROR: migration bundle verification key is not readable" >&2
  exit 1
fi

work_directory="$(mktemp -d)"
BUNDLE_DIR="$work_directory/bundle"
plan=""
cleanup() {
  rm -rf "$work_directory"
  if [[ -n "$plan" ]]; then
    rm -f "$plan"
  fi
}
trap cleanup EXIT
install -m 600 "$STAGING_DIR/migrations.tgz" "$work_directory/migrations.tgz"
install -m 600 "$STAGING_DIR/migrations.hmac" "$work_directory/migrations.hmac"

python3 - \
  "$release_sha" \
  "$work_directory/migrations.tgz" \
  "$work_directory/migrations.hmac" \
  "$BUNDLE_HMAC_KEY_FILE" <<'PY'
import hashlib
import hmac
import pathlib
import sys

release_sha, bundle_path, signature_path, key_path = sys.argv[1:]
key = pathlib.Path(key_path).read_bytes().strip()
if len(key) < 32:
    raise SystemExit("ERROR: migration bundle verification key is too short")
digest = hmac.new(key, digestmod=hashlib.sha256)
digest.update(f"{release_sha}\n".encode())
with pathlib.Path(bundle_path).open("rb") as bundle:
    while chunk := bundle.read(1024 * 1024):
        digest.update(chunk)
expected = pathlib.Path(signature_path).read_text().strip()
if not hmac.compare_digest(digest.hexdigest(), expected):
    raise SystemExit("ERROR: migration bundle signature verification failed")
PY

install -d -m 700 "$BUNDLE_DIR"
tar -xzf "$work_directory/migrations.tgz" -C "$BUNDLE_DIR" \
  --no-same-owner --no-same-permissions
if [[ ! -f "$BUNDLE_DIR/.release/migrations.tsv" ]]; then
  echo "ERROR: signed migration manifest is missing" >&2
  exit 1
fi

if ! [[ "$MIGRATION_LOCK_WAIT_SECONDS" =~ ^[0-9]+$ ]]; then
  echo "ERROR: MIGRATION_LOCK_WAIT_SECONDS must be a non-negative integer" >&2
  exit 1
fi

exec 9>"$DATABASE_MAINTENANCE_LOCK_FILE"
if ! flock -w "$MIGRATION_LOCK_WAIT_SECONDS" 9; then
  echo "ERROR: another production migration is running" >&2
  exit 75
fi

manifest="$BUNDLE_DIR/.release/migrations.tsv"
declare -a migration_times migration_hashes migration_tags
position=0
previous_time=-1

while IFS=$'\t' read -r index timestamp hash tag extra; do
  if [[ -n "${extra:-}" || "$index" != "$position" || \
    ! "$timestamp" =~ ^[0-9]+$ || "$timestamp" -le "$previous_time" || \
    ! "$hash" =~ ^[0-9a-f]{64}$ || ! "$tag" =~ ^[0-9]{4}_[a-z0-9_]+$ ]]; then
    echo "ERROR: invalid migration manifest at position $position" >&2
    exit 1
  fi

  sql_file="$BUNDLE_DIR/src/db/migrations/${tag}.sql"
  if [[ ! -f "$sql_file" ]]; then
    echo "ERROR: migration file is missing: $tag" >&2
    exit 1
  fi
  if grep -Eq '^[[:space:]]*\\' "$sql_file"; then
    echo "ERROR: psql meta-commands are not allowed in migrations: $tag" >&2
    exit 1
  fi
  actual_hash="$(sha256sum "$sql_file" | cut -d ' ' -f 1)"
  if [[ "$actual_hash" != "$hash" ]]; then
    echo "ERROR: migration hash does not match the journal: $tag" >&2
    exit 1
  fi

  migration_times+=("$timestamp")
  migration_hashes+=("$hash")
  migration_tags+=("$tag")
  previous_time="$timestamp"
  position=$((position + 1))
done < "$manifest"

if [[ "$position" -eq 0 ]]; then
  echo "ERROR: migration manifest is empty" >&2
  exit 1
fi

history_table="$(
  docker exec "$POSTGRES_CONTAINER" psql \
    --username="$MIGRATION_ROLE" \
    --dbname="$POSTGRES_DATABASE" \
    --no-password \
    --no-psqlrc \
    --tuples-only \
    --no-align \
    --command="SELECT to_regclass('drizzle.__drizzle_migrations')"
)"
history_table="${history_table//[[:space:]]/}"

applied_rows=()
if [[ -n "$history_table" ]]; then
  mapfile -t applied_rows < <(
    docker exec "$POSTGRES_CONTAINER" psql \
      --username="$MIGRATION_ROLE" \
      --dbname="$POSTGRES_DATABASE" \
      --no-password \
      --no-psqlrc \
      --tuples-only \
      --no-align \
      --field-separator=$'\t' \
      --command='SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at, id'
  )
fi

applied_count="${#applied_rows[@]}"
if (( applied_count > position )); then
  echo "ERROR: production has migrations unknown to this release" >&2
  exit 1
fi

for ((i = 0; i < applied_count; i += 1)); do
  IFS=$'\t' read -r applied_hash applied_time <<< "${applied_rows[$i]}"
  if [[ "$applied_hash" != "${migration_hashes[$i]}" || \
    "$applied_time" != "${migration_times[$i]}" ]]; then
    echo "ERROR: production migration history diverges at index $i" >&2
    exit 1
  fi
done

pending_count=$((position - applied_count))
echo "Applied migrations: $applied_count; pending migrations: $pending_count"

if [[ "$MODE" == "status" || "$pending_count" -eq 0 ]]; then
  exit 0
fi

if [[ ! -x "$BACKUP_COMMAND" ]]; then
  echo "ERROR: backup command is not executable: $BACKUP_COMMAND" >&2
  exit 1
fi

READ_BUDDY_MAINTENANCE_LOCK_HELD=1 "$BACKUP_COMMAND" >/dev/null

plan="$(mktemp)"
{
  printf '\\set ON_ERROR_STOP on\n'
  printf "SET statement_timeout = '15min';\n"
  printf "SET lock_timeout = '30s';\n"
  printf "SELECT pg_advisory_lock(724431864207284131);\n"
  printf 'CREATE SCHEMA IF NOT EXISTS drizzle;\n'
  printf 'CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint);\n'
  printf 'DO $history$\nDECLARE history_count bigint;\nBEGIN\n'
  printf '  SELECT count(*) INTO history_count FROM drizzle.__drizzle_migrations;\n'
  printf '  IF history_count <> %s THEN RAISE EXCEPTION '\''Migration history changed after validation'\''; END IF;\n' "$applied_count"
  for ((i = 0; i < applied_count; i += 1)); do
    printf "  IF NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = '%s' AND created_at = %s) THEN RAISE EXCEPTION 'Applied migration history diverged'; END IF;\n" \
      "${migration_hashes[$i]}" "${migration_times[$i]}"
  done
  printf 'END\n$history$;\n'

  for ((i = applied_count; i < position; i += 1)); do
    printf '\n-- Applying %s\n' "${migration_tags[$i]}"
    printf 'BEGIN;\n'
    cat "$BUNDLE_DIR/src/db/migrations/${migration_tags[$i]}.sql"
    printf "\nINSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('%s', %s);\n" \
      "${migration_hashes[$i]}" "${migration_times[$i]}"
    printf 'COMMIT;\n'
  done
  printf 'SELECT pg_advisory_unlock(724431864207284131);\n'
} > "$plan"

echo "Applying $pending_count migration(s) in individual transactions."
docker exec -i "$POSTGRES_CONTAINER" psql \
  --username="$MIGRATION_ROLE" \
  --dbname="$POSTGRES_DATABASE" \
  --no-password \
  --no-psqlrc < "$plan"

mapfile -t verified_rows < <(
  docker exec "$POSTGRES_CONTAINER" psql \
    --username="$MIGRATION_ROLE" \
    --dbname="$POSTGRES_DATABASE" \
    --no-password \
    --no-psqlrc \
    --tuples-only \
    --no-align \
    --field-separator=$'\t' \
    --command='SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at, id'
)
if [[ "${#verified_rows[@]}" -ne "$position" ]]; then
  echo "ERROR: post-migration history verification failed" >&2
  exit 1
fi
for ((i = 0; i < position; i += 1)); do
  IFS=$'\t' read -r verified_hash verified_time <<< "${verified_rows[$i]}"
  if [[ "$verified_hash" != "${migration_hashes[$i]}" || \
    "$verified_time" != "${migration_times[$i]}" ]]; then
    echo "ERROR: post-migration history diverges at index $i" >&2
    exit 1
  fi
done

echo "Migration reconciliation completed successfully."
