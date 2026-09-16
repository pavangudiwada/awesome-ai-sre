create extension if not exists pgcrypto;
create schema if not exists auth;
create schema if not exists private;

create table if not exists auth."user" (
  id uuid primary key default gen_random_uuid(), name text not null, email text not null unique,
  email_verified boolean not null default false, image text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists auth.session (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth."user"(id) on delete cascade, token text not null unique, expires_at timestamptz not null, ip_address text, user_agent text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists auth.account (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth."user"(id) on delete cascade, account_id text not null, provider_id text not null, access_token text, refresh_token text, id_token text, password text, access_token_expires_at timestamptz, refresh_token_expires_at timestamptz, scope text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists auth.verification (id uuid primary key default gen_random_uuid(), identifier text not null, value text not null, expires_at timestamptz not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table if not exists public.catalog_company_refs (slug text primary key, name text not null, website_domain text, is_active boolean not null default true, last_synced_at timestamptz not null default now());
create table if not exists public.catalog_product_refs (slug text primary key, name text not null, url text, company_slug text references public.catalog_company_refs(slug), is_active boolean not null default true, yaml_hash text, last_synced_at timestamptz not null default now());
create table if not exists public.practitioner_profiles (user_id uuid primary key references auth."user"(id) on delete cascade, display_name text, role text, organization text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (display_name is null or length(btrim(display_name)) between 1 and 120), check (role is null or length(role) <= 120), check (organization is null or length(organization) <= 160));
create table if not exists public.saved_products (practitioner_id uuid not null references auth."user"(id) on delete cascade, product_slug text not null references public.catalog_product_refs(slug), created_at timestamptz not null default now(), primary key(practitioner_id, product_slug));
create table if not exists public.company_follows (practitioner_id uuid not null references auth."user"(id) on delete cascade, company_slug text not null references public.catalog_company_refs(slug) on delete cascade, created_at timestamptz not null default now(), primary key(practitioner_id, company_slug));
create table if not exists public.evaluations (id uuid primary key default gen_random_uuid(), practitioner_id uuid not null references auth."user"(id) on delete cascade, name text not null check(length(btrim(name)) between 1 and 120), goal text check(goal is null or length(goal) <= 4000), requirements text check(requirements is null or length(requirements) <= 8000), risks text check(risks is null or length(risks) <= 8000), decision text not null default 'undecided' check(decision in ('undecided','advance','hold','reject')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.evaluation_products (evaluation_id uuid not null references public.evaluations(id) on delete cascade, product_slug text not null references public.catalog_product_refs(slug), position integer, created_at timestamptz not null default now(), primary key(evaluation_id, product_slug));
create table if not exists public.product_notes (practitioner_id uuid not null references auth."user"(id) on delete cascade, product_slug text not null references public.catalog_product_refs(slug) on delete cascade, body text not null check(length(btrim(body)) between 1 and 20000), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(practitioner_id, product_slug));
create table if not exists public.published_updates (id uuid primary key default gen_random_uuid(), slug text not null unique, company_slug text references public.catalog_company_refs(slug) on delete set null, product_slug text references public.catalog_product_refs(slug) on delete set null, title text not null, summary text not null, content_path text not null, source_url text, published_at timestamptz not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.update_reads (practitioner_id uuid not null references auth."user"(id) on delete cascade, update_id uuid not null references public.published_updates(id) on delete cascade, read_at timestamptz not null default now(), primary key(practitioner_id, update_id));
create table if not exists public.editorial_submissions (id uuid primary key default gen_random_uuid(), submission_type text not null check(submission_type in ('correction','company_update')), relationship text not null check(relationship in ('practitioner','company_employee','founder','agency','other')), product_slug text references public.catalog_product_refs(slug) on delete set null, company_slug text references public.catalog_company_refs(slug) on delete set null, source_url text not null check(length(source_url) <= 2000 and source_url ~* '^https?://'), message text not null check(length(btrim(message)) between 20 and 10000), contact_email text not null check(length(contact_email) <= 320), submitted_by uuid references auth."user"(id) on delete set null, status text not null default 'pending' check(status in ('pending','reviewing','accepted','rejected')), submitted_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by uuid references auth."user"(id) on delete set null, operator_notes text);
create table if not exists private.editorial_submission_throttles (key_kind text not null check(key_kind in ('ip','account')), key_hash text not null check(length(key_hash)=64), window_started_at timestamptz not null default now(), submission_count integer not null default 1 check(submission_count between 1 and 5), last_submitted_at timestamptz not null default now(), primary key(key_kind,key_hash));
create table if not exists private.analytics_events (id uuid primary key default gen_random_uuid(), occurred_on date not null default (timezone('utc', now())::date), occurred_at timestamptz not null default now(), visitor_day_hash text not null check(visitor_day_hash ~ '^[0-9a-f]{64}$'), network_day_hash text check(network_day_hash is null or network_day_hash ~ '^[0-9a-f]{64}$'), event_type text not null check(event_type in ('profile_view','outbound_click','update_view','share')), subject_kind text not null check(subject_kind in ('product','company','update')), subject_slug text not null, unique(occurred_on,visitor_day_hash,event_type,subject_kind,subject_slug));
create table if not exists private.analytics_ingestion_limits (window_started_at timestamptz not null, source_hash text not null check(source_hash ~ '^[0-9a-f]{64}$'), request_count integer not null check(request_count > 0), primary key(window_started_at,source_hash));
create index if not exists evaluations_practitioner_id_idx on public.evaluations(practitioner_id);
create index if not exists evaluation_products_evaluation_position_idx on public.evaluation_products(evaluation_id, position);

create or replace function private.enforce_workflow_quota() returns trigger language plpgsql as $$
declare count_rows bigint;
begin
  if tg_table_name = 'evaluations' then
    perform pg_advisory_xact_lock(hashtextextended('evaluation:' || new.practitioner_id::text, 0));
    select count(*) into count_rows from public.evaluations where practitioner_id = new.practitioner_id;
    if count_rows >= 50 then raise exception 'evaluation quota exceeded'; end if;
  elsif tg_table_name = 'product_notes' then
    perform pg_advisory_xact_lock(hashtextextended('note:' || new.practitioner_id::text, 0));
    if not exists (select 1 from public.product_notes where practitioner_id = new.practitioner_id and product_slug = new.product_slug) then
      select count(*) into count_rows from public.product_notes where practitioner_id = new.practitioner_id;
      if count_rows >= 500 then raise exception 'product note quota exceeded'; end if;
    end if;
  elsif tg_table_name = 'evaluation_products' then
    perform pg_advisory_xact_lock(hashtextextended('evaluation-product:' || new.evaluation_id::text, 0));
    if not exists (select 1 from public.evaluation_products where evaluation_id = new.evaluation_id and product_slug = new.product_slug) then
      select count(*) into count_rows from public.evaluation_products where evaluation_id = new.evaluation_id;
      if count_rows >= 100 then raise exception 'evaluation product quota exceeded'; end if;
    end if;
  end if;
  return new;
end $$;
create trigger evaluations_enforce_row_quota before insert on public.evaluations for each row execute function private.enforce_workflow_quota();
create trigger product_notes_enforce_row_quota before insert on public.product_notes for each row execute function private.enforce_workflow_quota();
create trigger evaluation_products_enforce_row_quota before insert on public.evaluation_products for each row execute function private.enforce_workflow_quota();
