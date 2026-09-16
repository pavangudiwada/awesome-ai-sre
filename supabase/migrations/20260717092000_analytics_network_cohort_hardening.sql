-- A daily network HMAC makes cohort eligibility conservative even when a
-- client ignores Set-Cookie or replays multiple valid signed cookies. Raw IPs
-- never enter Postgres, and the HMAC cannot be joined across UTC days.
-- Existing rows remain null and are excluded from future cohort eligibility
-- because their network source cannot be reconstructed safely.
alter table private.analytics_events
  add column network_day_hash text,
  add constraint analytics_events_network_day_hash_format check (
    network_day_hash is null or network_day_hash ~ '^[0-9a-f]{64}$'
  );

create index analytics_events_day_network_idx
  on private.analytics_events(occurred_on, network_day_hash)
  where network_day_hash is not null;
