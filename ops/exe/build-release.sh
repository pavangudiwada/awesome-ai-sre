#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

release=${1:?usage: build-release.sh RELEASE_DIRECTORY APP_ENV_FILE}
env_file=${2:?usage: build-release.sh RELEASE_DIRECTORY APP_ENV_FILE}
test -d "$release"
test -r "$env_file"

(
  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a

  public_build_env=("NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL:?missing NEXT_PUBLIC_SITE_URL}")
  for name in NEXT_PUBLIC_TURNSTILE_SITE_KEY NEXT_PUBLIC_POSTHOG_KEY NEXT_PUBLIC_POSTHOG_HOST; do
    if [[ -n "${!name:-}" ]]; then
      public_build_env+=("$name=${!name}")
    fi
  done

  cd "$release"
  env -i "PATH=$PATH" "HOME=${HOME:-/root}" "${public_build_env[@]}" npm ci --include=dev
  ./node_modules/.bin/tsx scripts/verify-release-environment.ts
  env -i "PATH=$PATH" "HOME=${HOME:-/root}" "${public_build_env[@]}" npm run build
)
