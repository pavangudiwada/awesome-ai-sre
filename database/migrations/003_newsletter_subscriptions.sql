create table if not exists private.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  frequency text not null check(frequency in ('weekly', 'monthly')),
  status text not null default 'active' check(status in ('active', 'unsubscribed')),
  consent_text text not null,
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(length(email) between 3 and 320)
);

create unique index if not exists newsletter_subscriptions_email_unique_idx
  on private.newsletter_subscriptions(email);
create index if not exists newsletter_subscriptions_status_frequency_idx
  on private.newsletter_subscriptions(status, frequency);

create table if not exists private.newsletter_digest_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references private.newsletter_subscriptions(id) on delete cascade,
  frequency text not null check(frequency in ('weekly', 'monthly')),
  period_start date not null,
  period_end date not null,
  update_ids jsonb not null,
  status text not null default 'pending' check(status in ('pending', 'delivered', 'failed')),
  attempt_count integer not null default 1 check(attempt_count between 1 and 20),
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(period_start < period_end)
);

create unique index if not exists newsletter_digest_deliveries_period_unique_idx
  on private.newsletter_digest_deliveries(subscription_id, frequency, period_start);
create index if not exists newsletter_digest_deliveries_status_idx
  on private.newsletter_digest_deliveries(status, updated_at);

create table if not exists private.newsletter_signup_rate_limits (
  window_started_at timestamptz not null,
  source_hash text not null check(length(source_hash) = 64),
  request_count integer not null check(request_count > 0),
  primary key(window_started_at, source_hash)
);

create index if not exists newsletter_signup_rate_limits_expiry_idx
  on private.newsletter_signup_rate_limits(window_started_at);
