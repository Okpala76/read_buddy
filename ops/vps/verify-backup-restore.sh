#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

BACKUP_FILE="${1:-}"
if [[ ! -r "$BACKUP_FILE" ]]; then
  echo "Usage: verify-backup-restore <custom-format-backup>" >&2
  exit 1
fi

container="read_buddy_restore_drill_$$"
password="$(openssl rand -hex 24)"

cleanup() {
  docker rm --force --volumes "$container" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --detach \
  --name "$container" \
  --network none \
  --memory 256m \
  --cpus 0.5 \
  --tmpfs /var/lib/postgresql/data:rw,noexec,nosuid,size=192m \
  --env POSTGRES_DB=restore_drill \
  --env POSTGRES_USER=read_buddy_admin \
  --env "POSTGRES_PASSWORD=$password" \
  postgres:16-alpine >/dev/null

for _ in {1..30}; do
  if docker exec "$container" pg_isready \
    --username=read_buddy_admin --dbname=restore_drill >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

docker exec "$container" pg_isready \
  --username=read_buddy_admin --dbname=restore_drill >/dev/null
docker exec -i "$container" pg_restore \
  --username=read_buddy_admin \
  --dbname=restore_drill \
  --no-owner \
  --no-acl \
  --exit-on-error < "$BACKUP_FILE" >/dev/null
docker exec "$container" psql \
  --username=read_buddy_admin \
  --dbname=restore_drill \
  --no-psqlrc \
  --command="CREATE ROLE read_buddy_app NOLOGIN; GRANT USAGE ON SCHEMA public TO read_buddy_app; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO read_buddy_app; GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO read_buddy_app;"
docker exec "$container" psql \
  --username=read_buddy_admin \
  --dbname=restore_drill \
  --no-psqlrc \
  --tuples-only \
  --command="SELECT count(*) FROM drizzle.__drizzle_migrations; SET ROLE read_buddy_app; SELECT count(*) FROM public.users; SELECT count(*) FROM public.books; SELECT count(*) FROM public.reading_sessions;"

echo "Disposable restore drill completed successfully."
