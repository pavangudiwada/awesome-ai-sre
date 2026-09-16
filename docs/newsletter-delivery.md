# Newsletter digest delivery

The digest sender is deliberately a deployment-host job, not a GitHub Action.
It needs private PostgreSQL and Resend credentials, and ordinary CI must never
receive either. It queries only `public.published_updates`; release-feed review
candidates are not an input.

Required environment: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`,
`RESEND_API_KEY`, `RESEND_SENDER_EMAIL`, and a unique
`NEWSLETTER_UNSUBSCRIBE_SECRET` plus `NEWSLETTER_RATE_LIMIT_SECRET`, each unique
and at least 32 characters. Run a safe preview:

```bash
npm run newsletter:dry-run -- --frequency weekly
```

After a reviewed release and migration, install the checked-in service and
timers. They use the protected application environment and resolve the current
immutable release at execution time:

```bash
sudo install -m 0644 ops/exe/ai-sre-newsletter@.service /etc/systemd/system/
sudo install -m 0644 ops/exe/ai-sre-newsletter-weekly.timer /etc/systemd/system/
sudo install -m 0644 ops/exe/ai-sre-newsletter-monthly.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ai-sre-newsletter-weekly.timer ai-sre-newsletter-monthly.timer
```

Use the same secret-bearing service environment as the application; do not put
credentials in unit files. Delivery rows are unique per subscription,
frequency, and completed UTC calendar period. Failed or stale pending rows retry
with the same Resend idempotency key; dry runs create neither messages nor rows.

Every non-honeypot signup attempt consumes a privacy-preserving, HMAC-hashed
network budget in a fixed UTC hour; raw network addresses are never stored.
Repeated active signup at the same cadence is also a database-locked no-op: it does
not change consent or send another welcome email. New, reactivated, and changed
cadence subscriptions may receive one. Before public launch, add an independent
The newsletter limiter is deliberately separate from editorial submissions and
magic-link authentication because their limits and consent semantics differ.
