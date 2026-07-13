create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

create table public.practitioner_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text,
  organization text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.catalog_company_refs (
  slug text primary key,
  name text not null,
  website_domain text,
  is_active boolean not null default true,
  last_synced_at timestamptz not null default now()
);

create table public.catalog_product_refs (
  slug text primary key,
  name text not null,
  url text,
  company_slug text references public.catalog_company_refs(slug),
  is_active boolean not null default true,
  yaml_hash text,
  last_synced_at timestamptz not null default now()
);

create table public.evaluation_shortlists (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.practitioner_profiles(user_id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.evaluation_shortlist_items (
  shortlist_id uuid not null references public.evaluation_shortlists(id) on delete cascade,
  product_slug text not null references public.catalog_product_refs(slug),
  position int,
  created_at timestamptz not null default now(),
  primary key (shortlist_id, product_slug)
);

create table public.product_follows (
  practitioner_id uuid not null references public.practitioner_profiles(user_id) on delete cascade,
  product_slug text not null references public.catalog_product_refs(slug),
  created_at timestamptz not null default now(),
  primary key (practitioner_id, product_slug)
);

create table public.company_opt_ins (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.practitioner_profiles(user_id) on delete cascade,
  company_slug text not null references public.catalog_company_refs(slug),
  product_slug text references public.catalog_product_refs(slug),
  consent_text text not null,
  consented_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.source_links (
  id uuid primary key default gen_random_uuid(),
  product_slug text references public.catalog_product_refs(slug),
  company_slug text references public.catalog_company_refs(slug),
  url text not null,
  source_type text not null,
  discovered_by text not null default 'operator',
  discovered_at timestamptz not null default now(),
  last_checked_at timestamptz,
  content_hash text,
  notes text,
  constraint source_links_has_subject check (product_slug is not null or company_slug is not null)
);

create table public.evidence_candidates (
  id uuid primary key default gen_random_uuid(),
  source_link_id uuid references public.source_links(id) on delete set null,
  product_slug text references public.catalog_product_refs(slug),
  company_slug text references public.catalog_company_refs(slug),
  criterion text,
  claim_text text not null,
  claim_value jsonb,
  evidence_state text not null default 'unknown',
  extracted_by text not null default 'operator',
  extracted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.practitioner_profiles(user_id),
  private_notes text,
  constraint evidence_candidates_state check (
    evidence_state in ('unknown', 'confirmed', 'vendor_claimed', 'conflicting', 'rejected')
  ),
  constraint evidence_candidates_has_subject check (product_slug is not null or company_slug is not null)
);

create table public.practitioner_notes (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.practitioner_profiles(user_id) on delete cascade,
  product_slug text references public.catalog_product_refs(slug),
  shortlist_id uuid references public.evaluation_shortlists(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index catalog_product_refs_company_slug_idx on public.catalog_product_refs(company_slug);
create index evaluation_shortlists_practitioner_id_idx on public.evaluation_shortlists(practitioner_id);
create index evaluation_shortlist_items_product_slug_idx on public.evaluation_shortlist_items(product_slug);
create index product_follows_product_slug_idx on public.product_follows(product_slug);
create index company_opt_ins_practitioner_id_idx on public.company_opt_ins(practitioner_id);
create index company_opt_ins_company_slug_idx on public.company_opt_ins(company_slug);
create index company_opt_ins_product_slug_idx on public.company_opt_ins(product_slug);
create unique index company_opt_ins_active_unique_idx
  on public.company_opt_ins(practitioner_id, company_slug, coalesce(product_slug, ''))
  where revoked_at is null;
create index source_links_product_slug_idx on public.source_links(product_slug);
create index source_links_company_slug_idx on public.source_links(company_slug);
create index source_links_url_idx on public.source_links(url);
create index evidence_candidates_source_link_id_idx on public.evidence_candidates(source_link_id);
create index evidence_candidates_product_slug_idx on public.evidence_candidates(product_slug);
create index evidence_candidates_company_slug_idx on public.evidence_candidates(company_slug);
create index evidence_candidates_criterion_idx on public.evidence_candidates(criterion);
create index practitioner_notes_practitioner_id_idx on public.practitioner_notes(practitioner_id);
create index practitioner_notes_product_slug_idx on public.practitioner_notes(product_slug);
create index practitioner_notes_shortlist_id_idx on public.practitioner_notes(shortlist_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger practitioner_profiles_set_updated_at
  before update on public.practitioner_profiles
  for each row execute function private.set_updated_at();

create trigger evaluation_shortlists_set_updated_at
  before update on public.evaluation_shortlists
  for each row execute function private.set_updated_at();

create trigger practitioner_notes_set_updated_at
  before update on public.practitioner_notes
  for each row execute function private.set_updated_at();

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
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name',
        new.raw_user_meta_data ->> 'user_name'
      ),
      ''
    )
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created_create_practitioner_profile
  after insert on auth.users
  for each row execute function private.handle_new_practitioner();

alter table public.practitioner_profiles enable row level security;
alter table public.catalog_company_refs enable row level security;
alter table public.catalog_product_refs enable row level security;
alter table public.evaluation_shortlists enable row level security;
alter table public.evaluation_shortlist_items enable row level security;
alter table public.product_follows enable row level security;
alter table public.company_opt_ins enable row level security;
alter table public.source_links enable row level security;
alter table public.evidence_candidates enable row level security;
alter table public.practitioner_notes enable row level security;

grant usage on schema public to authenticated;
grant usage on schema public to service_role;
grant select, insert, update on public.practitioner_profiles to authenticated;
grant select on public.catalog_company_refs to authenticated;
grant select on public.catalog_product_refs to authenticated;
grant select, insert, update, delete on public.evaluation_shortlists to authenticated;
grant select, insert, update, delete on public.evaluation_shortlist_items to authenticated;
grant select, insert, delete on public.product_follows to authenticated;
grant select, insert, update on public.company_opt_ins to authenticated;
grant select on public.source_links to authenticated;
grant select on public.evidence_candidates to authenticated;
grant select, insert, update, delete on public.practitioner_notes to authenticated;
grant all on public.practitioner_profiles to service_role;
grant all on public.catalog_company_refs to service_role;
grant all on public.catalog_product_refs to service_role;
grant all on public.evaluation_shortlists to service_role;
grant all on public.evaluation_shortlist_items to service_role;
grant all on public.product_follows to service_role;
grant all on public.company_opt_ins to service_role;
grant all on public.source_links to service_role;
grant all on public.evidence_candidates to service_role;
grant all on public.practitioner_notes to service_role;

create policy "Practitioners can read their own profile"
  on public.practitioner_profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Practitioners can insert their own profile"
  on public.practitioner_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Practitioners can update their own profile"
  on public.practitioner_profiles
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Authenticated practitioners can read active company refs"
  on public.catalog_company_refs
  for select
  to authenticated
  using (is_active);

create policy "Authenticated practitioners can read active product refs"
  on public.catalog_product_refs
  for select
  to authenticated
  using (is_active);

create policy "Practitioners can manage their own shortlists"
  on public.evaluation_shortlists
  for all
  to authenticated
  using ((select auth.uid()) = practitioner_id)
  with check ((select auth.uid()) = practitioner_id);

create policy "Practitioners can read their own shortlist items"
  on public.evaluation_shortlist_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.evaluation_shortlists shortlists
      where shortlists.id = evaluation_shortlist_items.shortlist_id
        and shortlists.practitioner_id = (select auth.uid())
    )
  );

create policy "Practitioners can insert their own shortlist items"
  on public.evaluation_shortlist_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.evaluation_shortlists shortlists
      where shortlists.id = evaluation_shortlist_items.shortlist_id
        and shortlists.practitioner_id = (select auth.uid())
    )
  );

create policy "Practitioners can update their own shortlist items"
  on public.evaluation_shortlist_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.evaluation_shortlists shortlists
      where shortlists.id = evaluation_shortlist_items.shortlist_id
        and shortlists.practitioner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.evaluation_shortlists shortlists
      where shortlists.id = evaluation_shortlist_items.shortlist_id
        and shortlists.practitioner_id = (select auth.uid())
    )
  );

create policy "Practitioners can delete their own shortlist items"
  on public.evaluation_shortlist_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.evaluation_shortlists shortlists
      where shortlists.id = evaluation_shortlist_items.shortlist_id
        and shortlists.practitioner_id = (select auth.uid())
    )
  );

create policy "Practitioners can read their own product follows"
  on public.product_follows
  for select
  to authenticated
  using ((select auth.uid()) = practitioner_id);

create policy "Practitioners can create their own product follows"
  on public.product_follows
  for insert
  to authenticated
  with check ((select auth.uid()) = practitioner_id);

create policy "Practitioners can delete their own product follows"
  on public.product_follows
  for delete
  to authenticated
  using ((select auth.uid()) = practitioner_id);

create policy "Practitioners can read their own company opt-ins"
  on public.company_opt_ins
  for select
  to authenticated
  using ((select auth.uid()) = practitioner_id);

create policy "Practitioners can create their own company opt-ins"
  on public.company_opt_ins
  for insert
  to authenticated
  with check ((select auth.uid()) = practitioner_id);

create policy "Practitioners can revoke their own company opt-ins"
  on public.company_opt_ins
  for update
  to authenticated
  using ((select auth.uid()) = practitioner_id)
  with check ((select auth.uid()) = practitioner_id);

create policy "Authenticated practitioners can read source links"
  on public.source_links
  for select
  to authenticated
  using (true);

create policy "Authenticated practitioners can read evidence candidates"
  on public.evidence_candidates
  for select
  to authenticated
  using (true);

create policy "Practitioners can read their own notes"
  on public.practitioner_notes
  for select
  to authenticated
  using ((select auth.uid()) = practitioner_id);

create policy "Practitioners can create their own notes"
  on public.practitioner_notes
  for insert
  to authenticated
  with check (
    (select auth.uid()) = practitioner_id
    and (
      shortlist_id is null
      or exists (
        select 1
        from public.evaluation_shortlists shortlists
        where shortlists.id = practitioner_notes.shortlist_id
          and shortlists.practitioner_id = (select auth.uid())
      )
    )
  );

create policy "Practitioners can update their own notes"
  on public.practitioner_notes
  for update
  to authenticated
  using ((select auth.uid()) = practitioner_id)
  with check (
    (select auth.uid()) = practitioner_id
    and (
      shortlist_id is null
      or exists (
        select 1
        from public.evaluation_shortlists shortlists
        where shortlists.id = practitioner_notes.shortlist_id
          and shortlists.practitioner_id = (select auth.uid())
      )
    )
  );

create policy "Practitioners can delete their own notes"
  on public.practitioner_notes
  for delete
  to authenticated
  using ((select auth.uid()) = practitioner_id);
