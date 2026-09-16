-- Bound public analytics ingestion without storing request IPs, user identity,
-- destination/channel/share text/URLs, notes, or search content. Source hashes
-- are HMACed by the application with the fixed window in the input, so they
-- cannot be joined across windows and expire from this table after one day.
create table private.analytics_ingestion_limits (
  window_started_at timestamptz not null,
  source_hash text not null,
  request_count integer not null,
  primary key (window_started_at, source_hash),
  constraint analytics_ingestion_limits_window_aligned check (
    date_trunc('minute', window_started_at) = window_started_at
  ),
  constraint analytics_ingestion_limits_source_hash_format check (
    source_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint analytics_ingestion_limits_request_count_positive check (
    request_count > 0
  )
);

create index analytics_ingestion_limits_expiry_idx
  on private.analytics_ingestion_limits(window_started_at);

alter table private.analytics_ingestion_limits enable row level security;
revoke all on table private.analytics_ingestion_limits
  from public, anon, authenticated;
grant all on table private.analytics_ingestion_limits to service_role;

-- Collapse existing retries before enforcing one stored action per visitor,
-- subject, event type, and UTC day. This bounds replay inflation while keeping
-- the daily pseudonym rotation promised by the privacy policy.
delete from private.analytics_events
where id in (
  select id
  from (
    select
      id,
      row_number() over (
        partition by
          occurred_on,
          visitor_day_hash,
          event_type,
          subject_kind,
          subject_slug
        order by occurred_at, id
      ) as duplicate_number
    from private.analytics_events
  ) as ranked_events
  where duplicate_number > 1
);

create unique index analytics_events_daily_action_unique_idx
  on private.analytics_events (
    occurred_on,
    visitor_day_hash,
    event_type,
    subject_kind,
    subject_slug
  );
