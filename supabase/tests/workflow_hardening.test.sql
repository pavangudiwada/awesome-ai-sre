begin;

create extension if not exists pgtap with schema extensions;
select plan(29);

select has_table(
  'private',
  'workflow_text_quarantine',
  'oversized legacy workflow text is preserved in a private quarantine'
);
select has_table(
  'private',
  'editorial_submission_quarantine',
  'invalid legacy editorial submissions are preserved in a private quarantine'
);
select is(
  (
    select count(*)::integer
    from pg_constraint
    where connamespace in ('public'::regnamespace, 'private'::regnamespace)
      and conname in (
        'practitioner_profiles_display_name_bounds',
        'practitioner_profiles_role_bounds',
        'practitioner_profiles_organization_bounds',
        'evaluations_name_bounds',
        'evaluations_goal_bounds',
        'evaluations_requirements_bounds',
        'evaluations_risks_bounds',
        'evaluations_decision_allowed',
        'product_notes_body_bounds',
        'editorial_submissions_source_url_bounds',
        'editorial_submissions_message_bounds',
        'editorial_submissions_contact_email_bounds'
      )
  ),
  12,
  'all workflow input constraints exist after the upgrade'
);
select is(
  (
    select count(*)::integer
    from pg_constraint
    where connamespace in ('public'::regnamespace, 'private'::regnamespace)
      and conname in (
        'practitioner_profiles_display_name_bounds',
        'practitioner_profiles_role_bounds',
        'practitioner_profiles_organization_bounds',
        'evaluations_name_bounds',
        'evaluations_goal_bounds',
        'evaluations_requirements_bounds',
        'evaluations_risks_bounds',
        'evaluations_decision_allowed',
        'product_notes_body_bounds',
        'editorial_submissions_source_url_bounds',
        'editorial_submissions_message_bounds',
        'editorial_submissions_contact_email_bounds'
      )
      and not convalidated
  ),
  0,
  'all workflow input constraints validate after legacy remediation'
);

select ok(
  not has_table_privilege('anon', 'public.editorial_submissions', 'INSERT'),
  'anonymous clients cannot insert editorial submissions directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.editorial_submissions', 'INSERT'),
  'authenticated clients cannot insert editorial submissions directly'
);
select ok(
  not has_function_privilege(
    'anon',
    'private.submit_editorial_submission(text,text,text,text,text,text,text,uuid,text,text,boolean)',
    'EXECUTE'
  ),
  'anonymous clients cannot execute the server-only submission function'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.submit_editorial_submission(text,text,text,text,text,text,text,uuid,text,text,boolean)',
    'EXECUTE'
  ),
  'authenticated clients cannot execute the server-only submission function'
);

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
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'workflow-test@example.com',
  '',
  now(),
  '{}',
  '{}',
  now(),
  now()
);

insert into public.catalog_product_refs (slug, name, is_active)
values ('workflow-test-product', 'Workflow Test Product', true);

select throws_ok(
  $$
    insert into public.evaluations (practitioner_id, name, decision)
    values ('10000000-0000-0000-0000-000000000001', 'Invalid', 'maybe')
  $$,
  '23514',
  null,
  'the database rejects decisions outside the UI enum'
);

select throws_ok(
  $$
    insert into public.product_notes (practitioner_id, product_slug, body)
    values ('10000000-0000-0000-0000-000000000001', 'workflow-test-product', '   ')
  $$,
  '23514',
  null,
  'the database rejects normalized-empty notes'
);

select throws_ok(
  $$
    insert into public.evaluations (practitioner_id, name, goal)
    values (
      '10000000-0000-0000-0000-000000000001',
      'Oversized goal',
      repeat('g', 4001)
    )
  $$,
  '23514',
  null,
  'the validated database rejects an oversized legacy-style evaluation goal'
);
select throws_ok(
  $$
    insert into public.evaluations (practitioner_id, name, requirements)
    values (
      '10000000-0000-0000-0000-000000000001',
      'Oversized requirements',
      repeat('r', 8001)
    )
  $$,
  '23514',
  null,
  'the validated database rejects oversized evaluation requirements'
);
select throws_ok(
  $$
    insert into public.evaluations (practitioner_id, name, risks)
    values (
      '10000000-0000-0000-0000-000000000001',
      'Oversized risks',
      repeat('r', 8001)
    )
  $$,
  '23514',
  null,
  'the validated database rejects oversized evaluation risks'
);
select throws_ok(
  $$
    insert into public.product_notes (practitioner_id, product_slug, body)
    values (
      '10000000-0000-0000-0000-000000000001',
      'workflow-test-product',
      repeat('n', 20001)
    )
  $$,
  '23514',
  null,
  'the validated database rejects oversized product notes'
);
select throws_ok(
  $$
    insert into public.editorial_submissions (
      submission_type, relationship, product_slug, source_url, message, contact_email
    ) values (
      'correction', 'practitioner', 'workflow-test-product',
      'https://example.com/' || repeat('s', 2000),
      'A sufficiently detailed correction for editorial review.',
      'workflow-test@example.com'
    )
  $$,
  '23514',
  null,
  'the validated database rejects oversized editorial source URLs'
);
select throws_ok(
  $$
    insert into public.editorial_submissions (
      submission_type, relationship, product_slug, source_url, message, contact_email
    ) values (
      'correction', 'practitioner', 'workflow-test-product',
      'ftp://example.com/source',
      'A sufficiently detailed correction for editorial review.',
      'workflow-test@example.com'
    )
  $$,
  '23514',
  null,
  'the validated database rejects non-HTTP editorial sources'
);
select throws_ok(
  $$
    insert into public.editorial_submissions (
      submission_type, relationship, product_slug, source_url, message, contact_email
    ) values (
      'correction', 'practitioner', 'workflow-test-product',
      'https://example.com/source', repeat('m', 10001), 'workflow-test@example.com'
    )
  $$,
  '23514',
  null,
  'the validated database rejects oversized editorial messages'
);
select throws_ok(
  $$
    insert into public.editorial_submissions (
      submission_type, relationship, product_slug, source_url, message, contact_email
    ) values (
      'correction', 'practitioner', 'workflow-test-product',
      'https://example.com/source', 'too short', 'workflow-test@example.com'
    )
  $$,
  '23514',
  null,
  'the validated database rejects undersized editorial messages'
);
select throws_ok(
  $$
    insert into public.editorial_submissions (
      submission_type, relationship, product_slug, source_url, message, contact_email
    ) values (
      'correction', 'practitioner', 'workflow-test-product',
      'https://example.com/source',
      'A sufficiently detailed correction for editorial review.',
      repeat('e', 310) || '@example.com'
    )
  $$,
  '23514',
  null,
  'the validated database rejects oversized editorial contact email'
);
select throws_ok(
  $$
    insert into public.editorial_submissions (
      submission_type, relationship, product_slug, source_url, message, contact_email
    ) values (
      'correction', 'practitioner', 'workflow-test-product',
      'https://example.com/source',
      'A sufficiently detailed correction for editorial review.',
      'invalid-email'
    )
  $$,
  '23514',
  null,
  'the validated database rejects malformed editorial contact email'
);

select throws_ok(
  $$
    select private.submit_editorial_submission(
      'correction',
      'practitioner',
      'workflow-test-product',
      null,
      'https://example.com/source',
      'A sufficiently detailed correction for editorial review.',
      'workflow-test@example.com',
      '10000000-0000-0000-0000-000000000001',
      repeat('a', 64),
      repeat('b', 64),
      false
    )
  $$,
  '42501',
  null,
  'the server-only submission function requires anti-bot verification'
);

select lives_ok(
  $$
    select private.submit_editorial_submission(
      'correction',
      'practitioner',
      'workflow-test-product',
      null,
      'https://example.com/source',
      'A sufficiently detailed correction for editorial review.',
      'workflow-test@example.com',
      '10000000-0000-0000-0000-000000000001',
      repeat('a', 64),
      repeat('b', 64),
      true
    )
  $$,
  'a verified server submission is accepted'
);
select is(
  (select count(*)::integer from public.editorial_submissions),
  1,
  'the private ingestion path creates one pending submission'
);
select throws_ok(
  $$
    select private.submit_editorial_submission(
      'correction',
      'practitioner',
      'workflow-test-product',
      null,
      'https://example.com/source-2',
      'A second sufficiently detailed correction for editorial review.',
      'workflow-test@example.com',
      '10000000-0000-0000-0000-000000000001',
      repeat('a', 64),
      repeat('b', 64),
      true
    )
  $$,
  'P0001',
  null,
  'durable database throttling rejects an immediate repeat submission'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';

create temporary table workflow_created_evaluation (id uuid not null);
insert into workflow_created_evaluation
select public.create_evaluation_with_product(
  'Atomic evaluation',
  '',
  '',
  '',
  'undecided',
  'workflow-test-product'
);

select is(
  (select count(*)::integer from workflow_created_evaluation),
  1,
  'the atomic evaluation RPC returns one id'
);
select is(
  (select count(*)::integer from public.evaluations where name = 'Atomic evaluation'),
  1,
  'the atomic evaluation RPC creates the evaluation'
);
select is(
  (
    select count(*)::integer
    from public.evaluation_products
    where evaluation_id = (select id from workflow_created_evaluation)
      and product_slug = 'workflow-test-product'
  ),
  1,
  'the atomic evaluation RPC creates the initial candidate'
);

select throws_ok(
  $$
    select public.create_evaluation_with_product(
      'Must roll back', '', '', '', 'undecided', 'missing-product'
    )
  $$,
  '23503',
  null,
  'an invalid initial product fails the complete RPC'
);
select is(
  (select count(*)::integer from public.evaluations where name = 'Must roll back'),
  0,
  'a failed initial candidate rolls back its evaluation'
);

reset role;
select * from finish();
rollback;
