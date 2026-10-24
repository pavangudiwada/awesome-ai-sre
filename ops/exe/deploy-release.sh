#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

release=${1:?usage: deploy-release.sh RELEASE_DIRECTORY [ROOT]}
root=${2:-/srv/awesome-ai-sre}
state_dir="$root/shared/state"
live="$root/current"

release=$(realpath "$release")
case "$release" in "$root"/releases/*) ;; *) echo "release must be below $root/releases" >&2; exit 2 ;; esac
test -d "$release"
test -f "$release/.next/BUILD_ID"
test -r "$root/shared/env/app.env"
mkdir -p "$state_dir"
exec 9>"$state_dir/database-operations.lock"
flock -n 9 || { echo "database operation already running" >&2; exit 1; }
previous=$(readlink -f "$live" 2>/dev/null || true)
cutover=0
rollback() {
  code=$?
  trap - EXIT
  if (( cutover )) && test -n "$previous" && test -d "$previous"; then
    if ! ln -sfn "$previous" "$live.next" || ! mv -Tf "$live.next" "$live"; then
      echo "rollback failed: could not restore previous release $(basename "$previous")" >&2
      exit "$code"
    fi
    if ! systemctl restart ai-sre.service; then
      echo "rollback failed: could not restart previous release $(basename "$previous")" >&2
    elif ! wait_for_health; then
      echo "rollback failed: previous release $(basename "$previous") did not pass homepage and readiness checks" >&2
    else
      printf 'rollback_health_verified=%s\n' "$(basename "$previous")" >&2
    fi
  fi
  exit "$code"
}

wait_for_health() {
  for _ in $(seq 1 30); do
    if curl --max-time 5 -fsS http://127.0.0.1:8000/ >/dev/null &&
      curl --max-time 5 -fsS http://127.0.0.1:8000/api/health/ready >/dev/null; then
      return 0
    fi
    sleep 1
  done
  curl --max-time 5 -fsS http://127.0.0.1:8000/ >/dev/null &&
    curl --max-time 5 -fsS http://127.0.0.1:8000/api/health/ready >/dev/null
}
trap rollback EXIT

ln -sfn "$release" "$live.next"
mv -Tf "$live.next" "$live"
cutover=1
systemctl restart ai-sre.service
wait_for_health
printf '%s\n' "$(basename "$release")" >"$state_dir/deployed-snapshot"
cutover=0
trap - EXIT
