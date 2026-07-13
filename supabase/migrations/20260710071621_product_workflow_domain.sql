-- Replace the legacy shortlist/follow vocabulary without losing practitioner data.
-- A legacy product_follows row represented the UI's Save action, so the table is
-- renamed in place and is deliberately not used to seed company_follows.
alter table public.product_follows rename to saved_products;
alter table public.saved_products
  rename constraint product_follows_pkey to saved_products_pkey;
alter index public.product_follows_product_slug_idx
  rename to saved_products_product_slug_idx;

alter table public.evaluation_shortlists rename to evaluations;
alter table public.evaluations
  rename constraint evaluation_shortlists_pkey to evaluations_pkey;
alter index public.evaluation_shortlists_practitioner_id_idx
  rename to evaluations_practitioner_id_idx;
alter trigger evaluation_shortlists_set_updated_at on public.evaluations
  rename to evaluations_set_updated_at;

alter table public.evaluation_shortlist_items rename to evaluation_products;
alter table public.evaluation_products rename column shortlist_id to evaluation_id;
alter table public.evaluation_products
  rename constraint evaluation_shortlist_items_pkey to evaluation_products_pkey;
alter table public.evaluation_products
  rename constraint evaluation_shortlist_items_shortlist_id_fkey
  to evaluation_products_evaluation_id_fkey;
alter table public.evaluation_products
  rename constraint evaluation_shortlist_items_product_slug_fkey
  to evaluation_products_product_slug_fkey;
alter index public.evaluation_shortlist_items_product_slug_idx
  rename to evaluation_products_product_slug_idx;

alter table public.evaluations
  add column goal text,
  add column requirements text,
  add column risks text,
  add column decision text;

-- Keep the original flexible notes read-only for recovery, while moving the
-- latest product note into the one-note-per-product model used by the app.
alter table public.practitioner_notes rename to legacy_practitioner_notes;
alter table public.legacy_practitioner_notes
  rename constraint practitioner_notes_pkey to legacy_practitioner_notes_pkey;
alter index public.practitioner_notes_practitioner_id_idx
  rename to legacy_practitioner_notes_practitioner_id_idx;
alter index public.practitioner_notes_product_slug_idx
  rename to legacy_practitioner_notes_product_slug_idx;
alter index public.practitioner_notes_shortlist_id_idx
  rename to legacy_practitioner_notes_evaluation_id_idx;
alter table public.legacy_practitioner_notes rename column shortlist_id to evaluation_id;
alter table public.legacy_practitioner_notes
  rename constraint practitioner_notes_shortlist_id_fkey
  to legacy_practitioner_notes_evaluation_id_fkey;
alter table public.legacy_practitioner_notes
  rename constraint practitioner_notes_product_slug_fkey
  to legacy_practitioner_notes_product_slug_fkey;
alter table public.legacy_practitioner_notes
  rename constraint practitioner_notes_practitioner_id_fkey
  to legacy_practitioner_notes_practitioner_id_fkey;
alter trigger practitioner_notes_set_updated_at on public.legacy_practitioner_notes
  rename to legacy_practitioner_notes_set_updated_at;

create table public.product_notes (
  practitioner_id uuid not null
    references public.practitioner_profiles(user_id) on delete cascade,
  product_slug text not null
    references public.catalog_product_refs(slug) on delete cascade,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (practitioner_id, product_slug)
);

insert into public.product_notes (
  practitioner_id,
  product_slug,
  body,
  created_at,
  updated_at
)
select distinct on (practitioner_id, product_slug)
  practitioner_id,
  product_slug,
  body,
  created_at,
  updated_at
from public.legacy_practitioner_notes
where product_slug is not null
order by practitioner_id, product_slug, updated_at desc, created_at desc, id desc;

create index product_notes_product_slug_idx
  on public.product_notes(product_slug);

create table public.company_follows (
  practitioner_id uuid not null
    references public.practitioner_profiles(user_id) on delete cascade,
  company_slug text not null
    references public.catalog_company_refs(slug) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (practitioner_id, company_slug)
);

create index company_follows_company_slug_idx
  on public.company_follows(company_slug);

create table public.published_updates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  company_slug text references public.catalog_company_refs(slug) on delete set null,
  product_slug text references public.catalog_product_refs(slug) on delete set null,
  title text not null,
  summary text not null,
  content_path text not null,
  source_url text,
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_updates_slug_format check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint published_updates_content_path_internal check (
    content_path ~ '^/updates/[a-z0-9]+(?:-[a-z0-9]+)*$'
  )
);

create index published_updates_company_published_idx
  on public.published_updates(company_slug, published_at desc);
create index published_updates_product_published_idx
  on public.published_updates(product_slug, published_at desc);
create index published_updates_published_at_idx
  on public.published_updates(published_at desc);

create table public.update_reads (
  practitioner_id uuid not null
    references public.practitioner_profiles(user_id) on delete cascade,
  update_id uuid not null
    references public.published_updates(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (practitioner_id, update_id)
);

create index update_reads_update_id_idx on public.update_reads(update_id);

create table public.editorial_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_type text not null,
  relationship text not null,
  product_slug text references public.catalog_product_refs(slug) on delete set null,
  company_slug text references public.catalog_company_refs(slug) on delete set null,
  source_url text not null,
  message text not null,
  contact_email text not null,
  submitted_by uuid default auth.uid() references auth.users(id) on delete set null,
  status text not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  operator_notes text,
  constraint editorial_submissions_type check (
    submission_type in ('correction', 'company_update')
  ),
  constraint editorial_submissions_relationship check (
    relationship in ('practitioner', 'company_employee', 'founder', 'agency', 'other')
  ),
  constraint editorial_submissions_status check (
    status in ('pending', 'reviewing', 'accepted', 'rejected')
  ),
  constraint editorial_submissions_has_subject check (
    product_slug is not null or company_slug is not null
  ),
  constraint editorial_submissions_source_url_not_blank check (
    length(btrim(source_url)) > 0
  ),
  constraint editorial_submissions_message_not_blank check (
    length(btrim(message)) > 0
  ),
  constraint editorial_submissions_contact_email_not_blank check (
    length(btrim(contact_email)) > 0
  )
);

create index editorial_submissions_status_submitted_idx
  on public.editorial_submissions(status, submitted_at);
create index editorial_submissions_company_slug_idx
  on public.editorial_submissions(company_slug);
create index editorial_submissions_product_slug_idx
  on public.editorial_submissions(product_slug);

create trigger product_notes_set_updated_at
  before update on public.product_notes
  for each row execute function private.set_updated_at();

create trigger published_updates_set_updated_at
  before update on public.published_updates
  for each row execute function private.set_updated_at();

-- Consent text, subject, practitioner, and consent timestamp are immutable.
-- Authenticated practitioners receive UPDATE privilege for revoked_at only, and
-- this trigger turns it into a single one-way revoke at the database clock.
create or replace function private.enforce_company_opt_in_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.practitioner_id is distinct from old.practitioner_id
    or new.company_slug is distinct from old.company_slug
    or new.product_slug is distinct from old.product_slug
    or new.consent_text is distinct from old.consent_text
    or new.consented_at is distinct from old.consented_at then
    raise exception 'Company opt-in consent is immutable';
  end if;

  if old.revoked_at is not null then
    raise exception 'Company opt-in consent is already revoked';
  end if;

  if new.revoked_at is null then
    raise exception 'Company opt-in updates may only revoke consent';
  end if;

  new.revoked_at := now();
  return new;
end;
$$;

create trigger company_opt_ins_enforce_immutability
  before update on public.company_opt_ins
  for each row execute function private.enforce_company_opt_in_immutability();

alter table public.product_notes enable row level security;
alter table public.company_follows enable row level security;
alter table public.published_updates enable row level security;
alter table public.update_reads enable row level security;
alter table public.editorial_submissions enable row level security;

-- Remove policies whose names and semantics belonged to the legacy model.
drop policy if exists "Practitioners can read their own product follows"
  on public.saved_products;
drop policy if exists "Practitioners can create their own product follows"
  on public.saved_products;
drop policy if exists "Practitioners can delete their own product follows"
  on public.saved_products;

drop policy if exists "Practitioners can manage their own shortlists"
  on public.evaluations;
drop policy if exists "Practitioners can read their own shortlist items"
  on public.evaluation_products;
drop policy if exists "Practitioners can insert their own shortlist items"
  on public.evaluation_products;
drop policy if exists "Practitioners can update their own shortlist items"
  on public.evaluation_products;
drop policy if exists "Practitioners can delete their own shortlist items"
  on public.evaluation_products;

drop policy if exists "Practitioners can read their own notes"
  on public.legacy_practitioner_notes;
drop policy if exists "Practitioners can create their own notes"
  on public.legacy_practitioner_notes;
drop policy if exists "Practitioners can update their own notes"
  on public.legacy_practitioner_notes;
drop policy if exists "Practitioners can delete their own notes"
  on public.legacy_practitioner_notes;

drop policy if exists "Authenticated practitioners can read source links"
  on public.source_links;
drop policy if exists "Authenticated practitioners can read evidence candidates"
  on public.evidence_candidates;

drop policy if exists "Practitioners can read their own company opt-ins"
  on public.company_opt_ins;
drop policy if exists "Practitioners can create their own company opt-ins"
  on public.company_opt_ins;
drop policy if exists "Practitioners can revoke their own company opt-ins"
  on public.company_opt_ins;

-- The default is deny. Grant only the operations each browser workflow needs.
revoke all on table public.saved_products from anon, authenticated;
grant select, insert, delete on table public.saved_products to authenticated;

revoke all on table public.evaluations from anon, authenticated;
grant select, insert, update, delete on table public.evaluations to authenticated;

revoke all on table public.evaluation_products from anon, authenticated;
grant select, insert, update, delete on table public.evaluation_products to authenticated;

revoke all on table public.legacy_practitioner_notes from anon, authenticated;
grant select on table public.legacy_practitioner_notes to authenticated;

revoke all on table public.product_notes from anon, authenticated;
grant select, insert, update, delete on table public.product_notes to authenticated;

revoke all on table public.company_follows from anon, authenticated;
grant select, insert, delete on table public.company_follows to authenticated;

revoke all on table public.company_opt_ins from anon, authenticated;
grant select, insert on table public.company_opt_ins to authenticated;
grant update (revoked_at) on table public.company_opt_ins to authenticated;

revoke all on table public.source_links from public, anon, authenticated;
revoke all on table public.evidence_candidates from public, anon, authenticated;

revoke all on table public.published_updates from anon, authenticated;
grant select on table public.published_updates to anon, authenticated;

revoke all on table public.update_reads from anon, authenticated;
grant select, insert, update, delete on table public.update_reads to authenticated;

revoke all on table public.editorial_submissions from anon, authenticated;
grant insert (
  submission_type,
  relationship,
  product_slug,
  company_slug,
  source_url,
  message,
  contact_email
) on table public.editorial_submissions to anon, authenticated;

grant all on table public.saved_products to service_role;
grant all on table public.evaluations to service_role;
grant all on table public.evaluation_products to service_role;
grant all on table public.legacy_practitioner_notes to service_role;
grant all on table public.product_notes to service_role;
grant all on table public.company_follows to service_role;
grant all on table public.published_updates to service_role;
grant all on table public.update_reads to service_role;
grant all on table public.editorial_submissions to service_role;

create policy "Practitioners can read their saved products"
  on public.saved_products for select to authenticated
  using ((select auth.uid()) = practitioner_id);

create policy "Practitioners can save products"
  on public.saved_products for insert to authenticated
  with check ((select auth.uid()) = practitioner_id);

create policy "Practitioners can remove their saved products"
  on public.saved_products for delete to authenticated
  using ((select auth.uid()) = practitioner_id);

create policy "Practitioners can read their evaluations"
  on public.evaluations for select to authenticated
  using ((select auth.uid()) = practitioner_id);

create policy "Practitioners can create evaluations"
  on public.evaluations for insert to authenticated
  with check ((select auth.uid()) = practitioner_id);

create policy "Practitioners can update their evaluations"
  on public.evaluations for update to authenticated
  using ((select auth.uid()) = practitioner_id)
  with check ((select auth.uid()) = practitioner_id);

create policy "Practitioners can delete their evaluations"
  on public.evaluations for delete to authenticated
  using ((select auth.uid()) = practitioner_id);

create policy "Practitioners can read products in their evaluations"
  on public.evaluation_products for select to authenticated
  using (
    exists (
      select 1 from public.evaluations
      where evaluations.id = evaluation_products.evaluation_id
        and evaluations.practitioner_id = (select auth.uid())
    )
  );

create policy "Practitioners can add products to their evaluations"
  on public.evaluation_products for insert to authenticated
  with check (
    exists (
      select 1 from public.evaluations
      where evaluations.id = evaluation_products.evaluation_id
        and evaluations.practitioner_id = (select auth.uid())
    )
  );

create policy "Practitioners can update products in their evaluations"
  on public.evaluation_products for update to authenticated
  using (
    exists (
      select 1 from public.evaluations
      where evaluations.id = evaluation_products.evaluation_id
        and evaluations.practitioner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.evaluations
      where evaluations.id = evaluation_products.evaluation_id
        and evaluations.practitioner_id = (select auth.uid())
    )
  );

create policy "Practitioners can remove products from their evaluations"
  on public.evaluation_products for delete to authenticated
  using (
    exists (
      select 1 from public.evaluations
      where evaluations.id = evaluation_products.evaluation_id
        and evaluations.practitioner_id = (select auth.uid())
    )
  );

create policy "Practitioners can read their legacy notes"
  on public.legacy_practitioner_notes for select to authenticated
  using ((select auth.uid()) = practitioner_id);

create policy "Practitioners can read their product notes"
  on public.product_notes for select to authenticated
  using ((select auth.uid()) = practitioner_id);

create policy "Practitioners can create product notes"
  on public.product_notes for insert to authenticated
  with check ((select auth.uid()) = practitioner_id);

create policy "Practitioners can update their product notes"
  on public.product_notes for update to authenticated
  using ((select auth.uid()) = practitioner_id)
  with check ((select auth.uid()) = practitioner_id);

create policy "Practitioners can delete their product notes"
  on public.product_notes for delete to authenticated
  using ((select auth.uid()) = practitioner_id);

create policy "Practitioners can read their company follows"
  on public.company_follows for select to authenticated
  using ((select auth.uid()) = practitioner_id);

create policy "Practitioners can follow companies"
  on public.company_follows for insert to authenticated
  with check ((select auth.uid()) = practitioner_id);

create policy "Practitioners can unfollow companies"
  on public.company_follows for delete to authenticated
  using ((select auth.uid()) = practitioner_id);

create policy "Practitioners can read their company opt-ins"
  on public.company_opt_ins for select to authenticated
  using ((select auth.uid()) = practitioner_id);

create policy "Practitioners can create company opt-ins"
  on public.company_opt_ins for insert to authenticated
  with check (
    (select auth.uid()) = practitioner_id
    and revoked_at is null
    and length(btrim(consent_text)) > 0
  );

create policy "Practitioners can revoke their company opt-ins"
  on public.company_opt_ins for update to authenticated
  using (
    (select auth.uid()) = practitioner_id
    and revoked_at is null
  )
  with check (
    (select auth.uid()) = practitioner_id
    and revoked_at is not null
  );

create policy "Anyone can read published updates"
  on public.published_updates for select to anon, authenticated
  using (published_at <= now());

create policy "Practitioners can read their update state"
  on public.update_reads for select to authenticated
  using ((select auth.uid()) = practitioner_id);

create policy "Practitioners can mark updates read"
  on public.update_reads for insert to authenticated
  with check ((select auth.uid()) = practitioner_id);

create policy "Practitioners can update their update state"
  on public.update_reads for update to authenticated
  using ((select auth.uid()) = practitioner_id)
  with check ((select auth.uid()) = practitioner_id);

create policy "Practitioners can clear their update state"
  on public.update_reads for delete to authenticated
  using ((select auth.uid()) = practitioner_id);

create policy "Visitors can submit editorial corrections"
  on public.editorial_submissions for insert to anon
  with check (
    submitted_by is null
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
    and operator_notes is null
  );

create policy "Practitioners can submit editorial corrections"
  on public.editorial_submissions for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
    and operator_notes is null
  );
