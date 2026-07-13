-- Privacy-safe, first-party engagement events. The raw visitor cookie never
-- enters Postgres: the application stores only an HMAC that rotates each UTC
-- day. This table intentionally lives outside the exposed public schema.
create table private.analytics_events (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null default (timezone('utc', now())::date),
  occurred_at timestamptz not null default now(),
  visitor_day_hash text not null,
  event_type text not null,
  subject_kind text not null,
  subject_slug text not null,
  constraint analytics_events_visitor_day_hash_format check (
    visitor_day_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint analytics_events_event_type check (
    event_type in ('profile_view', 'outbound_click', 'update_view')
  ),
  constraint analytics_events_subject_kind check (
    subject_kind in ('product', 'company', 'update')
  ),
  constraint analytics_events_subject_slug_format check (
    subject_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint analytics_events_event_subject_pair check (
    (event_type = 'profile_view' and subject_kind in ('product', 'company'))
    or event_type = 'outbound_click'
    or (event_type = 'update_view' and subject_kind = 'update')
  ),
  constraint analytics_events_utc_day_matches_timestamp check (
    occurred_on = timezone('utc', occurred_at)::date
  )
);

create index analytics_events_day_subject_idx
  on private.analytics_events(occurred_on, subject_kind, subject_slug);

create index analytics_events_day_event_idx
  on private.analytics_events(occurred_on, event_type);

create index analytics_events_day_actor_idx
  on private.analytics_events(occurred_on, visitor_day_hash);

alter table private.analytics_events enable row level security;

-- There are deliberately no anon/authenticated policies. Server-side Drizzle
-- connects directly with the database role; browser roles cannot use the
-- schema or table even if the private schema is exposed accidentally later.
revoke all on table private.analytics_events from public, anon, authenticated;
revoke usage on schema private from public, anon, authenticated;

grant usage on schema private to service_role;
grant all on table private.analytics_events to service_role;
