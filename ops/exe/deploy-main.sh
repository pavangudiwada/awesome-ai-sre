#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Build and release exactly the current immutable origin/main commit. A separate
# deployment lock serializes releases; the database lock spans backup, migration,
# and catalog-reference synchronization before cutover.
root=/srv/awesome-ai-sre
repository=${SOURCE_REPOSITORY:-"$root/repository"}
releases="$root/releases"
release_helper="$root/ops/exe/deploy-release.sh"
state_dir="$root/shared/state"
sha=${1:?usage: deploy-main.sh FULL_ORIGIN_MAIN_SHA}

[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || {
  echo "release SHA must be a full 40-character lowercase commit SHA" >&2
  exit 2
}
test -d "$repository/.git"
test -x "$release_helper"
test -r "$root/shared/env/app.env"
mkdir -p "$state_dir"
exec 9>"$state_dir/deployment.lock"
flock -n 9 || { echo "deployment already running" >&2; exit 1; }

git -C "$repository" fetch --quiet origin main
origin_main=$(git -C "$repository" rev-parse origin/main)
test "$sha" = "$origin_main" || {
  echo "release SHA must equal fetched origin/main ($origin_main)" >&2
  exit 2
}

release="$releases/$sha"
test ! -e "$release" || {
  echo "release already exists: $release" >&2
  exit 2
}
mkdir -p "$releases"
created_release=0
cleanup() {
  exit_code=$?
  if (( ! created_release )); then exit "$exit_code"; fi
  if test "$(readlink -f "$root/current" 2>/dev/null || true)" = "$release"; then
    echo "preserving active release after failure: $release" >&2
    exit "$exit_code"
  fi
  rm -rf -- "$release"
  exit "$exit_code"
}
trap cleanup EXIT

git clone --quiet --no-checkout "$repository" "$release"
created_release=1
git -C "$release" checkout --quiet --detach "$sha"
test "$(git -C "$release" rev-parse HEAD)" = "$sha"
test -z "$(git -C "$release" status --porcelain)"

(
  cd "$release"
  set -a
  # shellcheck disable=SC1091
  source "$root/shared/env/app.env"
  set +a
  npm ci --include=dev
  ./node_modules/.bin/tsx scripts/verify-release-environment.ts
  npm run build
  exec 8>"$state_dir/database-operations.lock"
  flock -n 8 || { echo "database operation already running" >&2; exit 1; }
  export AI_SRE_DATABASE_LOCK_HELD=1
  "$root/ops/exe/backup-and-restore.sh"
  ./node_modules/.bin/tsx scripts/migrate-database.ts
  ./node_modules/.bin/tsx scripts/sync-catalog-refs.ts --apply
  ./node_modules/.bin/tsx scripts/sync-catalog-refs.ts --verify
  unset AI_SRE_DATABASE_LOCK_HELD
  flock -u 8
)

"$release_helper" "$release"
created_release=0
trap - EXIT
printf 'deployed_sha=%s release=%s\n' "$sha" "$release"
