#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

CONFIG_FILE="${READ_BUDDY_RELEASE_CONFIG:-/home/gochi/read_buddy/release.env}"
if [[ ! -r "$CONFIG_FILE" ]]; then
  echo "ERROR: release configuration is not readable: $CONFIG_FILE" >&2
  exit 1
fi

# shellcheck source=/dev/null
source "$CONFIG_FILE"

: "${POSTGRES_CONTAINER:?POSTGRES_CONTAINER is required}"
: "${POSTGRES_DATABASE:?POSTGRES_DATABASE is required}"
: "${BACKUP_ROLE:?BACKUP_ROLE is required}"
: "${BACKUP_DIR:?BACKUP_DIR is required}"
: "${BACKUP_REMOTE:?BACKUP_REMOTE is required}"
: "${RCLONE_BIN:?RCLONE_BIN is required}"
: "${LOCAL_RETENTION_DAYS:?LOCAL_RETENTION_DAYS is required}"
: "${DATABASE_MAINTENANCE_LOCK_FILE:?DATABASE_MAINTENANCE_LOCK_FILE is required}"

if ! [[ "$LOCAL_RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "ERROR: LOCAL_RETENTION_DAYS must be a non-negative integer" >&2
  exit 1
fi

if [[ "${READ_BUDDY_MAINTENANCE_LOCK_HELD:-0}" != "1" ]]; then
  exec 8>"$DATABASE_MAINTENANCE_LOCK_FILE"
  if ! flock -w 300 8; then
    echo "ERROR: another database maintenance task is still running" >&2
    exit 75
  fi
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_name="read_buddy_${timestamp}.dump"
backup_path="${BACKUP_DIR}/${backup_name}"
temporary_path="${backup_path}.partial"
checksum_path="${backup_path}.sha256"

install -d -m 700 "$BACKUP_DIR"
rm -f "$temporary_path"
trap 'rm -f "$temporary_path"' EXIT

echo "Creating a custom-format PostgreSQL backup." >&2
docker exec "$POSTGRES_CONTAINER" pg_dump \
  --username="$BACKUP_ROLE" \
  --dbname="$POSTGRES_DATABASE" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-acl \
  --no-password > "$temporary_path"

if [[ ! -s "$temporary_path" ]]; then
  echo "ERROR: PostgreSQL backup is empty" >&2
  exit 1
fi

docker exec -i "$POSTGRES_CONTAINER" pg_restore --list < "$temporary_path" \
  >/dev/null
mv "$temporary_path" "$backup_path"
chmod 600 "$backup_path"
sha256sum "$backup_path" > "$checksum_path"
chmod 600 "$checksum_path"

if [[ ! -x "$RCLONE_BIN" ]]; then
  echo "ERROR: rclone is required for verified off-host backups" >&2
  exit 1
fi

remote_backup="${BACKUP_REMOTE%/}/${backup_name}"
remote_checksum="${remote_backup}.sha256"
"$RCLONE_BIN" copyto "$backup_path" "$remote_backup"
"$RCLONE_BIN" copyto "$checksum_path" "$remote_checksum"

local_hash="$(sha256sum "$backup_path" | cut -d ' ' -f 1)"
remote_hash="$("$RCLONE_BIN" cat "$remote_backup" | sha256sum | cut -d ' ' -f 1)"
if [[ "$local_hash" != "$remote_hash" ]]; then
  echo "ERROR: off-host backup checksum verification failed" >&2
  exit 1
fi

find "$BACKUP_DIR" -type f \
  \( -name 'read_buddy_*.dump' -o -name 'read_buddy_*.dump.sha256' \) \
  -mtime "+$LOCAL_RETENTION_DAYS" -delete

echo "Backup and off-host verification completed." >&2
printf '%s\n' "$backup_path"
