# exe.dev launch runtime

## Current launch state

**Verified 2026-09-16.** The public canonical domain is
`https://aisrewatchlist.com` on the existing exe VM. The root and readiness
endpoint return HTTPS `200`; `www.aisrewatchlist.com` and the former hostname
redirect to the canonical host while preserving paths and queries. Releases are
immutable Git `main` SHAs, not transferred dirty snapshots.

Resend is configured with a verified sender and the application now exposes
the email sign-in form. No real magic-link email has been sent; send one only
with the user's explicit permission.

The encrypted R2 recovery proof completed for snapshot `8040480d`, restoring
the retrieved PostgreSQL dump and verifying 2 users, 18 company references,
and 114 product references. The scheduled job runs daily at 03:30 UTC and
retains seven daily plus four weekly R2 snapshots.

The sections below retain the launch-test setup and operating procedure.

## Installed VM boundary

- Host: `ai-sre-launch.exe.xyz`
- Database: `postgres:16` container `ai-sre-pg`, database and role `ai_sre`
- Persistence: Docker named volume `ai-sre-postgres-data`
- Database listener: `127.0.0.1:5432` only
- Runtime: Bun `1.3.14`
- Application listener: systemd unit `ai-sre.service`, `127.0.0.1:8000`
- Release root: `/srv/awesome-ai-sre`, with `releases/`, `current`, and
  server-only files below `shared/`

`ops/exe/ai-sre.service` keeps the app on loopback behind the configured trusted
reverse proxy, which sets the canonical application origin and strips
client-supplied forwarding headers. Public access is served at the canonical
domain above; VM loopback remains useful for maintenance checks.

## Encrypted off-host database recovery

The database runtime has `unless-stopped` restart behavior and a persistent
volume. The checked-in helper creates a custom-format `pg_dump`, restores it
into a disposable database, uploads the verified dump into an encrypted restic
repository in a dedicated private Cloudflare R2 bucket, retrieves that exact
path, verifies its SHA-256 digest, and restores the retrieved copy into a
second disposable PostgreSQL database. R2 is recovery storage, not a running
database.

Before installing the helper, create an R2 bucket named
`ai-sre-watchlist-backups` and a separate R2 S3 API token with **Object Read &
Write** restricted to that bucket. Do not reuse Watch Changelog credentials.
Use the endpoint shown by Cloudflare, normally
`https://ACCOUNT_ID.r2.cloudflarestorage.com`.

On the VM, install restic and the secret environment file. Generate the restic
password on the VM; losing it makes every R2 backup unrecoverable.

```bash
sudo apt-get update
sudo apt-get install -y restic
sudo install -d -m 0700 /srv/awesome-ai-sre/shared/env
sudo install -m 0600 /dev/null /srv/awesome-ai-sre/shared/env/backup.env
sudoedit /srv/awesome-ai-sre/shared/env/backup.env
```

Populate `backup.env` from `ops/exe/backup.env.example`, substituting the
dedicated bucket endpoint and token credentials. Set a new random
`RESTIC_PASSWORD` with `openssl rand -base64 32`; store that password in the
team's password manager separately from the R2 token. For this launch, the
escrow copy is in the launch operator's macOS login Keychain under service
`ai-sre-watchlist-restic-r2-password` and account
`ai-sre-watchlist-backup`; it must remain available independently of the VM.
Initialize the empty
encrypted repository exactly once, after verifying the environment file:

```bash
sudo -E bash -c 'set -a; source /srv/awesome-ai-sre/shared/env/backup.env; set +a; restic -o s3.region=auto init'
```

Then run the checked-in helper on the VM:

```bash
sudo install -m 0750 ops/exe/backup-and-restore.sh /usr/local/sbin/ai-sre-db-backup-restore
sudo /usr/local/sbin/ai-sre-db-backup-restore
```

Successful output includes `r2_restore_verified=...`; this is the recovery
proof and must be recorded with the snapshot date before launch. The helper
also reports the restored public-table, user, company-reference, and
product-reference counts. It retains seven local dumps after success, but only
for regular canonical `db-YYYYMMDDTHHMMSSZ.dump` files; unfamiliar, manual,
malformed, unpaired, and symlinked files are preserved. R2 retains seven daily
plus four weekly encrypted snapshots. It shares `database-operations.lock`
with deployment.

Install `ops/exe/ai-sre-db-backup.service` and
`ops/exe/ai-sre-db-backup.timer` under `/etc/systemd/system`, then enable the
timer after the first manual R2 retrieval-and-restore proof succeeds. The timer
runs daily at 03:30 UTC with a bounded random delay.

## Application cutover

Create each release as a new directory under `/srv/awesome-ai-sre/releases`.
After the plain-Postgres migration command has been reviewed and succeeds,
atomically replace `/srv/awesome-ai-sre/current` with the new directory and
restart `ai-sre.service`. The unit consumes only
`/srv/awesome-ai-sre/shared/env/app.env` (mode `0600`); do not copy that file
into a release or repository.

Use `ops/exe/deploy-release.sh` for the symlink-and-restart step. It only
accepts a directory below `releases/`, takes the same operations lock as the
backup service, and requires a loopback homepage health response after restart.

The required app environment includes the loopback `DATABASE_URL`,
`BETTER_AUTH_SECRET`, canonical `BETTER_AUTH_URL`, and protected Resend
credentials. Keep all credentials out of the repository. Real magic-link
delivery remains a user-authorized production check.

Historical launch-test snapshots used a dirty working tree plus a content
digest. Current releases must use the reviewed immutable full SHA from
`origin/main` through `ops/exe/deploy-main.sh`.
