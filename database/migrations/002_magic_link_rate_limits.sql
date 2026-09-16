create table if not exists private.auth_magic_link_rate_limits (
  window_started_at timestamptz not null,
  key_kind text not null check(key_kind in ('network', 'email')),
  key_hash text not null check(length(key_hash) = 64),
  request_count integer not null check(request_count > 0),
  primary key(window_started_at, key_kind, key_hash)
);

create index if not exists auth_magic_link_rate_limits_expiry_idx
  on private.auth_magic_link_rate_limits(window_started_at);
