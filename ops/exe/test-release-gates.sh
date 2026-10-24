#!/usr/bin/env bash
set -Eeuo pipefail

repo=$(cd "$(dirname "$0")/../.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$tmp/bin"
main_events="$tmp/main-events"
cat >"$tmp/app.env" <<'EOF'
DATABASE_URL=postgres://private-db-sentinel
BETTER_AUTH_SECRET=private-auth-sentinel
RESEND_API_KEY=private-mail-sentinel
GOOGLE_CLIENT_SECRET=private-oauth-sentinel
NEXT_PUBLIC_SITE_URL=https://aisrewatchlist.com
NEXT_PUBLIC_TURNSTILE_SITE_KEY=public-turnstile-value
NEXT_PUBLIC_POSTHOG_KEY=public-posthog-value
NEXT_PUBLIC_POSTHOG_HOST=https://events.example.test
EOF
cat >"$tmp/bin/npm" <<EOF
#!/usr/bin/env bash
set -euo pipefail
for name in DATABASE_URL BETTER_AUTH_SECRET RESEND_API_KEY GOOGLE_CLIENT_SECRET; do
  case "\${!name:-}" in
    *private-*) exit 91 ;;
  esac
done
test "\$NEXT_PUBLIC_SITE_URL" = https://aisrewatchlist.com
test "\$NEXT_PUBLIC_TURNSTILE_SITE_KEY" = public-turnstile-value
test "\$NEXT_PUBLIC_POSTHOG_KEY" = public-posthog-value
test "\$NEXT_PUBLIC_POSTHOG_HOST" = https://events.example.test
test -n "\$PATH"
test -n "\$HOME"
printf 'npm:%s\n' "\$*" >>'$main_events'
if [[ "\$*" == 'run build' ]]; then
  mkdir -p .next
  : >.next/BUILD_ID
fi
EOF
chmod +x "$tmp/bin/npm"

main_root="$tmp/main"
mkdir -p "$main_root/repository/.git" "$main_root/releases/old/.next" \
  "$main_root/shared/env" "$main_root/shared/state" "$main_root/ops/exe" "$tmp/main-bin"
main_root=$(cd "$main_root" && pwd -P)
: >"$main_root/releases/old/.next/BUILD_ID"
ln -s "$main_root/releases/old" "$main_root/current"
cp "$tmp/app.env" "$main_root/shared/env/app.env"
chmod 600 "$main_root/shared/env/app.env"
cp "$repo/ops/exe/deploy-release.sh" "$main_root/ops/exe/deploy-release.sh"
cat >"$main_root/ops/exe/backup-and-restore.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
test "\$DATABASE_URL" = postgres://private-db-sentinel
test "\$BETTER_AUTH_SECRET" = private-auth-sentinel
test "\$RESEND_API_KEY" = private-mail-sentinel
test "\$GOOGLE_CLIENT_SECRET" = private-oauth-sentinel
test "\$AI_SRE_DATABASE_LOCK_HELD" = 1
printf 'trusted:backup\n' >>'$main_events'
EOF
chmod +x "$main_root/ops/exe/deploy-release.sh" "$main_root/ops/exe/backup-and-restore.sh"
sha=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
cat >"$tmp/main-bin/git" <<EOF
#!/usr/bin/env bash
set -euo pipefail
if [[ "\$1" == -C ]]; then
  case "\$3" in
    fetch) exit 0 ;;
    checkout) exit 0 ;;
    rev-parse)
      [[ "\$4" == origin/main ]] && printf '%s\\n' '$sha' || printf '%s\\n' '$sha'
      ;;
    status) exit 0 ;;
    *) exit 2 ;;
  esac
elif [[ "\$1" == clone ]]; then
  destination=\${@: -1}
  mkdir -p "\$destination/ops/exe" "\$destination/node_modules/.bin"
  cp '$repo/ops/exe/build-release.sh' "\$destination/ops/exe/build-release.sh"
  chmod +x "\$destination/ops/exe/build-release.sh"
  cat >"\$destination/node_modules/.bin/tsx" <<'TSX'
#!/usr/bin/env bash
set -euo pipefail
for name in DATABASE_URL BETTER_AUTH_SECRET RESEND_API_KEY GOOGLE_CLIENT_SECRET; do
  case "\${!name:-}" in *private-*) ;; *) exit 92 ;; esac
done
printf 'trusted:tsx:%s\\n' "\$*" >>'$main_events'
TSX
  chmod +x "\$destination/node_modules/.bin/tsx"
else
  exit 2
fi
EOF
cat >"$tmp/main-bin/chown" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
cat >"$tmp/main-bin/sudo" <<'EOF'
#!/usr/bin/env bash
shift 3
"$@"
EOF
cat >"$tmp/main-bin/flock" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
cat >"$tmp/main-bin/mv" <<'EOF'
#!/usr/bin/env bash
if [[ "$1" == -Tf ]]; then
  shift
  rm -f "$2"
  /bin/mv -f "$1" "$2"
else
  /bin/mv "$@"
fi
EOF
cat >"$tmp/main-bin/systemctl" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
cat >"$tmp/main-bin/curl" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$tmp/main-bin/git" "$tmp/main-bin/chown" "$tmp/main-bin/sudo" \
  "$tmp/main-bin/flock" "$tmp/main-bin/mv" "$tmp/main-bin/systemctl" "$tmp/main-bin/curl"
if ! result=$(PATH="$tmp/main-bin:$tmp/bin:$tmp/deploy-bin:$PATH" \
  "$repo/ops/exe/deploy-main.sh" "$sha" "$main_root" 2>&1); then
  printf '%s\n' "$result" >&2
  echo "expected isolated deployment flow to complete" >&2
  exit 1
fi
grep -q '^trusted:backup$' "$main_events"
grep -q '^trusted:tsx:scripts/verify-release-environment.ts$' "$main_events"
grep -q '^trusted:tsx:scripts/migrate-database.ts$' "$main_events"
grep -q '^trusted:tsx:scripts/sync-catalog-refs.ts --apply$' "$main_events"
grep -q '^npm:ci --include=dev$' "$main_events"
grep -q '^npm:run build$' "$main_events"
test "$(readlink "$main_root/current")" = "$main_root/releases/$sha"

mkdir -p "$tmp/deploy"
deploy_root=$(cd "$tmp/deploy" && pwd -P)
mkdir -p "$deploy_root/releases/old/.next" "$deploy_root/releases/new/.next" \
  "$deploy_root/shared/env" "$deploy_root/shared/state" "$tmp/deploy-bin"
: >"$deploy_root/releases/old/.next/BUILD_ID"
: >"$deploy_root/releases/new/.next/BUILD_ID"
: >"$deploy_root/shared/env/app.env"
ln -s "$deploy_root/releases/old" "$deploy_root/current"
events="$tmp/deploy-events"
cat >"$tmp/deploy-bin/systemctl" <<EOF
#!/usr/bin/env bash
printf 'restart:%s\n' "\$*" >>'$events'
EOF
cat >"$tmp/deploy-bin/curl" <<EOF
#!/usr/bin/env bash
set -euo pipefail
url=\${@: -1}
release=\$(basename "\$(readlink '$deploy_root/current')")
printf 'curl:%s:%s\n' "\$release" "\$url" >>'$events'
if [[ "\$release" == new ]] || [[ "\${TEST_FAIL_OLD:-}" == 1 ]]; then exit 22; fi
EOF
cat >"$tmp/deploy-bin/sleep" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
cat >"$tmp/deploy-bin/flock" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
cat >"$tmp/deploy-bin/mv" <<'EOF'
#!/usr/bin/env bash
if [[ "$1" == -Tf ]]; then
  shift
  source=$1 target=$2
  rm -f "$target"
  /bin/mv -f "$source" "$target"
else
  /bin/mv "$@"
fi
EOF
chmod +x "$tmp/deploy-bin/systemctl" "$tmp/deploy-bin/curl" "$tmp/deploy-bin/sleep" \
  "$tmp/deploy-bin/flock" "$tmp/deploy-bin/mv"

if output=$(PATH="$tmp/deploy-bin:$PATH" \
  "$repo/ops/exe/deploy-release.sh" "$deploy_root/releases/new" "$deploy_root" 2>&1); then
  echo "expected new release health failure" >&2
  exit 1
fi
test "$(readlink "$deploy_root/current")" = "$deploy_root/releases/old"
[[ "$output" == *rollback_health_verified=old* ]]
grep -q "curl:old:http://127.0.0.1:8000/" "$events"
grep -q "curl:old:http://127.0.0.1:8000/api/health/ready" "$events"

rm -f "$deploy_root/current"
ln -s "$deploy_root/releases/old" "$deploy_root/current"
if output=$(TEST_FAIL_OLD=1 PATH="$tmp/deploy-bin:$PATH" \
  "$repo/ops/exe/deploy-release.sh" "$deploy_root/releases/new" "$deploy_root" 2>&1); then
  echo "expected rollback health failure" >&2
  exit 1
fi
[[ "$output" == *"rollback failed: previous release old did not pass homepage and readiness checks"* ]]

printf 'release gate process checks passed\n'
