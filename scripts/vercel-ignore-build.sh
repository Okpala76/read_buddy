#!/usr/bin/env sh
set -eu

if [ "${VERCEL_GIT_COMMIT_REF:-}" = "main" ]; then
  echo "Skipping Git-triggered main build; GitHub Actions controls production."
  exit 0
fi

echo "Allowing Vercel preview build for ${VERCEL_GIT_COMMIT_REF:-unknown ref}."
exit 1
