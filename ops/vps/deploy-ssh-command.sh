#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

STAGING_ROOT=/home/gochi/read_buddy/releases
RECONCILER=/home/gochi/read_buddy/bin/reconcile-migrations
requested_command="${SSH_ORIGINAL_COMMAND:-}"

install -d -m 700 "$STAGING_ROOT"

if [[ "$requested_command" =~ ^stage-bundle\ ([0-9a-f]{40})$ ]]; then
  release_sha="${BASH_REMATCH[1]}"
  release_dir="$STAGING_ROOT/$release_sha"
  rm -rf "$release_dir"
  install -d -m 700 "$release_dir"
  cat > "$release_dir/migrations.tgz"
  test -s "$release_dir/migrations.tgz"
  echo "Staged bundle for $release_sha"
  exit 0
fi

if [[ "$requested_command" =~ ^stage-signature\ ([0-9a-f]{40})$ ]]; then
  release_sha="${BASH_REMATCH[1]}"
  release_dir="$STAGING_ROOT/$release_sha"
  if [[ ! -s "$release_dir/migrations.tgz" ]]; then
    echo "ERROR: stage the migration bundle before its signature" >&2
    exit 1
  fi
  signature="$(tr -d '[:space:]')"
  if [[ ! "$signature" =~ ^[0-9a-f]{64}$ ]]; then
    echo "ERROR: migration bundle signature is invalid" >&2
    exit 1
  fi
  printf '%s\n' "$signature" > "$release_dir/migrations.hmac"
  echo "Staged signature for $release_sha"
  exit 0
fi

if [[ "$requested_command" =~ ^reconcile\ ([0-9a-f]{40})\ (apply|status)$ ]]; then
  release_sha="${BASH_REMATCH[1]}"
  mode="${BASH_REMATCH[2]}"
  exec "$RECONCILER" "$STAGING_ROOT/$release_sha" "$mode"
fi

if [[ "$requested_command" =~ ^cleanup\ ([0-9a-f]{40})$ ]]; then
  release_sha="${BASH_REMATCH[1]}"
  rm -rf "$STAGING_ROOT/$release_sha"
  echo "Removed staged release $release_sha"
  exit 0
fi

echo "ERROR: deploy key command is not allowed" >&2
exit 126
