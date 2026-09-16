-- Expand phase: add the hardened application paths without rejecting traffic
-- from the currently live application. Data remediation, strict constraints,
-- quota triggers, and legacy editorial revocation are installed only by the
-- post-promotion contract migration.

-- Preserve hostile or pre-validation legacy data before making live rows fit
-- the application boundary. Workflow text remains attributable to its owner;
-- editorial submissions remain intact for operator review rather than having
-- URLs, messages, or contact PII silently truncated.
create table private.workflow_text_quarantine (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_key jsonb not null,
  field_name text not null,
  original_value text not null,
  retained_value text not null,
  reason text not null,
  quarantined_at timestamptz not null default now(),
  constraint workflow_text_quarantine_entity check (
    entity_type in ('evaluation', 'product_note')
  ),
  constraint workflow_text_quarantine_reason check (
    reason = 'legacy_value_exceeded_current_limit'
  )
);

create table private.editorial_submission_quarantine (
  submission_id uuid primary key,
  submission_payload jsonb not null,
  reasons text[] not null,
  quarantined_at timestamptz not null default now(),
  constraint editorial_submission_quarantine_has_reason check (
    cardinality(reasons) > 0
  )
);

revoke all on table private.workflow_text_quarantine
  from public, anon, authenticated;
revoke all on table private.editorial_submission_quarantine
  from public, anon, authenticated;
grant select on table private.workflow_text_quarantine to service_role;
grant select on table private.editorial_submission_quarantine to service_role;

-- Auth metadata can exceed application input limits. Keep automatic profile
-- creation from breaking sign-up while preserving a nullable display name.
create or replace function private.handle_new_practitioner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.practitioner_profiles (user_id, display_name)
  values (
    new.id,
    nullif(
      left(
        btrim(coalesce(
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'name',
          new.raw_user_meta_data ->> 'user_name',
          ''
        )),
        120
      ),
      ''
    )
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Bound private-workspace growth even when requests bypass application Zod.
create or replace function private.enforce_workflow_row_quota()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  quota_count bigint;
begin
  if tg_table_name = 'evaluations' then
    perform pg_advisory_xact_lock(hashtextextended('evaluation:' || new.practitioner_id::text, 0));
    select count(*) into quota_count
    from public.evaluations
    where practitioner_id = new.practitioner_id;
    if quota_count >= 50 then
      raise exception 'evaluation quota exceeded' using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'product_notes' then
    perform pg_advisory_xact_lock(hashtextextended('note:' || new.practitioner_id::text, 0));
    if exists (
      select 1 from public.product_notes
      where practitioner_id = new.practitioner_id
        and product_slug = new.product_slug
    ) then
      return new;
    end if;
    select count(*) into quota_count
    from public.product_notes
    where practitioner_id = new.practitioner_id;
    if quota_count >= 500 then
      raise exception 'product note quota exceeded' using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'evaluation_products' then
    perform pg_advisory_xact_lock(hashtextextended('evaluation-product:' || new.evaluation_id::text, 0));
    if exists (
      select 1 from public.evaluation_products
      where evaluation_id = new.evaluation_id
        and product_slug = new.product_slug
    ) then
      return new;
    end if;
    select count(*) into quota_count
    from public.evaluation_products
    where evaluation_id = new.evaluation_id;
    if quota_count >= 100 then
      raise exception 'evaluation product quota exceeded' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

-- One RPC makes the evaluation and optional initial candidate a single
-- transaction. It remains RLS-scoped to the authenticated practitioner.
create or replace function public.create_evaluation_with_product(
  evaluation_name text,
  evaluation_goal text default '',
  evaluation_requirements text default '',
  evaluation_risks text default '',
  evaluation_decision text default 'undecided',
  initial_product_slug text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  practitioner uuid := auth.uid();
  evaluation_uuid uuid;
begin
  if practitioner is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  insert into public.evaluations (
    practitioner_id,
    name,
    goal,
    requirements,
    risks,
    decision
  ) values (
    practitioner,
    evaluation_name,
    evaluation_goal,
    evaluation_requirements,
    evaluation_risks,
    evaluation_decision
  ) returning id into evaluation_uuid;

  if initial_product_slug is not null then
    insert into public.evaluation_products (evaluation_id, product_slug, position)
    values (evaluation_uuid, initial_product_slug, 0);
  end if;

  return evaluation_uuid;
end;
$$;

revoke all on function public.create_evaluation_with_product(text, text, text, text, text, text)
  from public, anon;
grant execute on function public.create_evaluation_with_product(text, text, text, text, text, text)
  to authenticated;

-- Durable fixed-window counters use only HMAC pseudonyms. No raw IP or account
-- identifier is stored in this unexposed private table.
create table private.editorial_submission_throttles (
  key_kind text not null,
  key_hash text not null,
  window_started_at timestamptz not null default now(),
  submission_count integer not null default 1,
  last_submitted_at timestamptz not null default now(),
  primary key (key_kind, key_hash),
  constraint editorial_submission_throttles_kind check (key_kind in ('ip', 'account')),
  constraint editorial_submission_throttles_hash check (length(key_hash) = 64),
  constraint editorial_submission_throttles_count check (submission_count between 1 and 5)
);

create index editorial_submission_throttles_expiry_idx
  on private.editorial_submission_throttles(last_submitted_at);

revoke all on table private.editorial_submission_throttles from public, anon, authenticated;

create or replace function private.consume_editorial_submission_throttle(
  throttle_kind text,
  throttle_hash text,
  hourly_limit integer
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  accepted text;
begin
  perform pg_advisory_xact_lock(hashtextextended(throttle_kind || ':' || throttle_hash, 0));

  insert into private.editorial_submission_throttles (
    key_kind,
    key_hash,
    window_started_at,
    submission_count,
    last_submitted_at
  ) values (throttle_kind, throttle_hash, now(), 1, now())
  on conflict (key_kind, key_hash) do update
  set window_started_at = case
        when private.editorial_submission_throttles.window_started_at <= now() - interval '1 hour'
          then now()
        else private.editorial_submission_throttles.window_started_at
      end,
      submission_count = case
        when private.editorial_submission_throttles.window_started_at <= now() - interval '1 hour'
          then 1
        else private.editorial_submission_throttles.submission_count + 1
      end,
      last_submitted_at = now()
  where private.editorial_submission_throttles.last_submitted_at <= now() - interval '60 seconds'
    and (
      private.editorial_submission_throttles.window_started_at <= now() - interval '1 hour'
      or private.editorial_submission_throttles.submission_count < hourly_limit
    )
  returning key_hash into accepted;

  if accepted is null then
    raise exception 'submission rate limit exceeded' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function private.submit_editorial_submission(
  p_submission_type text,
  p_relationship text,
  p_product_slug text,
  p_company_slug text,
  p_source_url text,
  p_message text,
  p_contact_email text,
  p_submitted_by uuid,
  p_ip_hash text,
  p_account_hash text,
  p_captcha_verified boolean
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  submission_uuid uuid;
begin
  if p_captcha_verified is not true then
    raise exception 'anti-bot verification required' using errcode = '42501';
  end if;

  delete from private.editorial_submission_throttles
  where last_submitted_at < now() - interval '24 hours';

  perform private.consume_editorial_submission_throttle('ip', p_ip_hash, 5);
  if p_account_hash is not null then
    perform private.consume_editorial_submission_throttle('account', p_account_hash, 3);
  end if;

  insert into public.editorial_submissions (
    submission_type,
    relationship,
    product_slug,
    company_slug,
    source_url,
    message,
    contact_email,
    submitted_by,
    status
  ) values (
    p_submission_type,
    p_relationship,
    p_product_slug,
    p_company_slug,
    p_source_url,
    p_message,
    p_contact_email,
    p_submitted_by,
    'pending'
  ) returning id into submission_uuid;

  return submission_uuid;
end;
$$;

-- The new private path is never exposed to Data API roles. The legacy table
-- INSERT grants and policies intentionally remain until post-promotion contract.
revoke all on function private.consume_editorial_submission_throttle(text, text, integer)
  from public, anon, authenticated;
revoke all on function private.submit_editorial_submission(text, text, text, text, text, text, text, uuid, text, text, boolean)
  from public, anon, authenticated;
