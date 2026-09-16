insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'legacy-upgrade@watchlist.test',
  '',
  now(),
  '{}',
  jsonb_build_object('full_name', repeat('p', 140)),
  now(),
  now()
);

update public.practitioner_profiles
set role = repeat('r', 140),
    organization = repeat('o', 180)
where user_id = '20000000-0000-0000-0000-000000000001';

insert into public.catalog_product_refs (slug, name, is_active)
values
  ('legacy-oversized', 'Legacy Oversized', true),
  ('legacy-empty', 'Legacy Empty', true),
  ('legacy-expand-write', 'Legacy Expand Write', true);

insert into public.evaluations (
  id,
  practitioner_id,
  name,
  goal,
  requirements,
  risks,
  decision
) values (
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000001',
  '   ',
  repeat('g', 4001),
  repeat('q', 8001),
  repeat('r', 8001),
  'legacy-decision'
);

insert into public.product_notes (practitioner_id, product_slug, body)
values
  (
    '20000000-0000-0000-0000-000000000001',
    'legacy-oversized',
    repeat('n', 20001)
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    'legacy-empty',
    '   '
  );

insert into public.editorial_submissions (
  id,
  submission_type,
  relationship,
  product_slug,
  source_url,
  message,
  contact_email
) values (
  '20000000-0000-0000-0000-000000000003',
  'correction',
  'practitioner',
  'legacy-oversized',
  'ftp://legacy.invalid/source',
  'short',
  'invalid-email'
);
