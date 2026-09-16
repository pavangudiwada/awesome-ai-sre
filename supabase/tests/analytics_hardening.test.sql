begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

select has_column(
  'private',
  'analytics_events',
  'network_day_hash',
  'analytics events retain a daily-only network cohort pseudonym'
);

select col_is_null(
  'private',
  'analytics_events',
  'network_day_hash',
  'legacy analytics rows may remain null rather than receiving a forged backfill'
);

select throws_ok(
  $$
    insert into private.analytics_events (
      occurred_on,
      occurred_at,
      visitor_day_hash,
      network_day_hash,
      event_type,
      subject_kind,
      subject_slug
    ) values (
      timezone('utc', now())::date,
      now(),
      repeat('a', 64),
      'raw-ip-or-invalid-hash',
      'profile_view',
      'product',
      'analytics-hardening-test'
    )
  $$,
  '23514',
  null,
  'the database rejects raw or malformed network identifiers'
);

select lives_ok(
  $$
    insert into private.analytics_events (
      occurred_on,
      occurred_at,
      visitor_day_hash,
      network_day_hash,
      event_type,
      subject_kind,
      subject_slug
    ) values (
      timezone('utc', now())::date,
      now(),
      repeat('b', 64),
      repeat('c', 64),
      'profile_view',
      'product',
      'analytics-hardening-test'
    )
  $$,
  'a valid daily network HMAC can be stored'
);

select ok(
  not has_table_privilege('anon', 'private.analytics_events', 'SELECT'),
  'anonymous clients cannot read cohort pseudonyms'
);

select * from finish();
rollback;
