# exe.dev launch-test runtime

This is the isolated runtime for AI SRE Watchlist launch validation. It does
not connect to the disconnected hosted Supabase project or use credentials from
local `.env*` files.

## Installed VM boundary

- Host: `ai-sre-launch.exe.xyz`
- Database: `postgres:16` container `ai-sre-pg`, database and role `ai_sre`
- Persistence: Docker named volume `ai-sre-postgres-data`
- Database listener: `127.0.0.1:5432` only
- Runtime: Bun `1.3.14`
- Application listener: systemd unit `ai-sre.service`, `127.0.0.1:8000`
- Release root: `/srv/awesome-ai-sre`, with `releases/`, `current`, and
  server-only files below `shared/`

`ops/exe/ai-sre.service` deliberately keeps the app on loopback. External
preview access requires an explicitly configured trusted reverse proxy that
sets the application origin and strips client-supplied forwarding headers.
Until then, screenshots and authenticated browser checks run on the VM through
loopback or an SSH tunnel. Do not call the loopback deployment a public preview.

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
team's password manager separately from the R2 token. Initialize the empty
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
retains seven local dumps after success and keeps seven daily plus four weekly
encrypted R2 snapshots. It shares `database-operations.lock` with deployment.

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

The required app environment will include the loopback `DATABASE_URL`,
`BETTER_AUTH_SECRET`, and the canonical `BETTER_AUTH_URL`. Email and OAuth are
external integration gates: keep Resend credentials and OAuth client secrets
out of the repository, and do not send real magic links from this launch-test
runtime.

For the present dirty working tree, record both the base Git SHA and a
content digest for the transferred snapshot. A release becomes immutable only
when its source is tied to a reviewed full Git SHA.
