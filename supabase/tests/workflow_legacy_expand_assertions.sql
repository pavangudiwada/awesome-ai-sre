do $$
declare
  strict_constraint_count integer;
begin
  select count(*) into strict_constraint_count
  from pg_constraint
  where connamespace = 'public'::regnamespace
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
    );
  if strict_constraint_count <> 0 then
    raise exception 'expand installed % strict constraints before promotion', strict_constraint_count;
  end if;

  if not has_column_privilege('anon', 'public.editorial_submissions', 'message', 'INSERT')
    or not has_column_privilege('authenticated', 'public.editorial_submissions', 'message', 'INSERT') then
    raise exception 'expand revoked the legacy editorial insert path';
  end if;

  if exists (
    select 1 from pg_trigger
    where tgrelid in (
      'public.evaluations'::regclass,
      'public.evaluation_products'::regclass,
      'public.product_notes'::regclass
    )
      and tgname like '%enforce_row_quota'
      and not tgisinternal
  ) then
    raise exception 'expand installed contract quota triggers';
  end if;

  if (select length(goal) from public.evaluations where id = '20000000-0000-0000-0000-000000000002') <> 4001 then
    raise exception 'expand modified oversized legacy evaluation content';
  end if;
  if (select length(body) from public.product_notes where product_slug = 'legacy-oversized') <> 20001 then
    raise exception 'expand modified oversized legacy note content';
  end if;
end;
$$;

-- These are the two legacy writes that must remain viable until promotion.
insert into public.product_notes (practitioner_id, product_slug, body)
values (
  '20000000-0000-0000-0000-000000000001',
  'legacy-expand-write',
  '   '
)
on conflict (practitioner_id, product_slug) do update set body = excluded.body;

insert into public.editorial_submissions (
  id,
  submission_type,
  relationship,
  product_slug,
  source_url,
  message,
  contact_email
) values (
  '20000000-0000-0000-0000-000000000004',
  'correction',
  'practitioner',
  'legacy-oversized',
  'https://example.com/legacy-expand-write',
  'A legacy application submission accepted during expand.',
  'legacy-expand@watchlist.test'
);
