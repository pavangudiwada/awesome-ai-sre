#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

root=/srv/awesome-ai-sre
container=ai-sre-pg
env_file="$root/shared/env/postgres.env"
backup_env_file="$root/shared/env/backup.env"
backup_dir="$root/shared/backups"
state_dir="$root/shared/state"

test -r "$env_file"
test -r "$backup_env_file"
test -d "$backup_dir"
docker inspect "$container" >/dev/null
mkdir -p "$state_dir"
if [[ "${AI_SRE_DATABASE_LOCK_HELD:-}" != "1" ]]; then
  exec 9>"$state_dir/database-operations.lock"
  flock -n 9 || { echo "database operation already running" >&2; exit 1; }
fi

stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="$backup_dir/db-${stamp}.dump"
restore_db="ai_sre_restore_${stamp}_$$"
recovery_dir=$(mktemp -d "$backup_dir/.r2-recovery.XXXXXXXX")
recovered_backup="$recovery_dir$backup"

docker exec "$container" pg_dump -U ai_sre -Fc ai_sre >"$backup"
test -s "$backup"

cleanup() {
  docker exec "$container" dropdb -U ai_sre --if-exists "$restore_db" >/dev/null 2>&1 || true
  rm -rf -- "$recovery_dir"
}
trap cleanup EXIT

docker exec "$container" createdb -U ai_sre "$restore_db"
docker exec -i "$container" pg_restore -U ai_sre -d "$restore_db" <"$backup"
docker exec "$container" psql -U ai_sre -d "$restore_db" -Atc \
  "select current_database() || ':' || current_user"

# The environment file contains only server-side R2 and restic credentials.
# shellcheck disable=SC1090
set -a
source "$backup_env_file"
set +a
: "${RESTIC_REPOSITORY:?missing RESTIC_REPOSITORY}"
: "${RESTIC_PASSWORD:?missing RESTIC_PASSWORD}"
: "${AWS_ACCESS_KEY_ID:?missing AWS_ACCESS_KEY_ID}"
: "${AWS_SECRET_ACCESS_KEY:?missing AWS_SECRET_ACCESS_KEY}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-auto}"
command -v restic >/dev/null
restic -o s3.region=auto snapshots >/dev/null || {
  echo "restic repository is unavailable or uninitialized; run restic init after configuring backup.env" >&2
  exit 1
}

# The dump is verified locally before upload. Restic encrypts the payload and
# repository metadata client-side before any bytes reach R2.
restic -o s3.region=auto backup "$backup" --tag ai-sre-db --tag postgres16

# Retrieve the just-uploaded path from R2 and prove that it is byte-identical
# before restoring it into a second disposable PostgreSQL database.
restic -o s3.region=auto restore latest --tag ai-sre-db --target "$recovery_dir" --include "$backup"
test -s "$recovered_backup"
test "$(sha256sum "$backup" | awk '{print $1}')" = "$(sha256sum "$recovered_backup" | awk '{print $1}')"

r2_restore_db="ai_sre_r2_restore_${stamp}_$$"
cleanup_r2_restore() {
  docker exec "$container" dropdb -U ai_sre --if-exists "$r2_restore_db" >/dev/null 2>&1 || true
}
trap 'cleanup_r2_restore; cleanup' EXIT
docker exec "$container" createdb -U ai_sre "$r2_restore_db"
docker exec -i "$container" pg_restore -U ai_sre -d "$r2_restore_db" <"$recovered_backup"
docker exec "$container" psql -U ai_sre -d "$r2_restore_db" -Atc \
  "select current_database() || ':' || current_user"

# Bound the encrypted off-host history only after a retrieval-and-restore
# proof. This keeps seven daily and four weekly recovery points.
restic -o s3.region=auto forget --tag ai-sre-db --group-by '' --keep-daily 7 --keep-weekly 4 --prune

mapfile -t backups < <(
  find "$backup_dir" -maxdepth 1 -type f -name 'db-*.dump' -printf '%T@ %p\n' |
    sort -rn | cut -d' ' -f2-
)
for stale in "${backups[@]:7}"; do
  case "$stale" in "$backup_dir"/db-*.dump) rm -f -- "$stale" ;; esac
done

printf 'backup=%s local_restore_verified=%s r2_restore_verified=%s\n' \
  "$backup" "$restore_db" "$r2_restore_db"
