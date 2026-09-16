do $$
declare
  strict_constraint_count integer;
  invalid_constraint_count integer;
  quota_trigger_count integer;
begin
  select count(*), count(*) filter (where not convalidated)
    into strict_constraint_count, invalid_constraint_count
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
  if strict_constraint_count <> 12 or invalid_constraint_count <> 0 then
    raise exception 'contract constraints: expected 12 validated, found % with % invalid',
      strict_constraint_count, invalid_constraint_count;
  end if;

  if has_column_privilege('anon', 'public.editorial_submissions', 'message', 'INSERT')
    or has_column_privilege('authenticated', 'public.editorial_submissions', 'message', 'INSERT') then
    raise exception 'contract retained the legacy editorial insert path';
  end if;
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'editorial_submissions'
      and policyname in (
        'Visitors can submit editorial corrections',
        'Practitioners can submit editorial corrections'
      )
  ) then
    raise exception 'contract retained a legacy editorial insert policy';
  end if;

  select count(*) into quota_trigger_count
  from pg_trigger
  where tgname in (
    'evaluations_enforce_row_quota',
    'evaluation_products_enforce_row_quota',
    'product_notes_enforce_row_quota'
  )
    and not tgisinternal;
  if quota_trigger_count <> 3 then
    raise exception 'contract installed % of 3 quota triggers', quota_trigger_count;
  end if;

  if (select count(*) from private.workflow_text_quarantine where entity_type = 'evaluation') <> 3 then
    raise exception 'evaluation quarantine did not preserve every oversized field';
  end if;
  if not exists (
    select 1
    from private.workflow_text_quarantine
    where entity_type = 'product_note'
      and field_name = 'body'
      and length(original_value) = 20001
      and length(retained_value) = 20000
  ) then
    raise exception 'product-note quarantine content is incomplete';
  end if;
  if not exists (
    select 1
    from private.editorial_submission_quarantine
    where submission_id = '20000000-0000-0000-0000-000000000003'
      and submission_payload ->> 'source_url' = 'ftp://legacy.invalid/source'
      and submission_payload ->> 'message' = 'short'
      and submission_payload ->> 'contact_email' = 'invalid-email'
      and reasons @> array[
        'source_url_is_not_http',
        'message_below_current_minimum',
        'contact_email_is_invalid'
      ]
  ) then
    raise exception 'editorial quarantine did not preserve complete invalid payload and reasons';
  end if;

  if exists (
    select 1 from public.product_notes
    where product_slug in ('legacy-empty', 'legacy-expand-write')
  ) then
    raise exception 'contract did not remove normalized-empty legacy notes';
  end if;
  if exists (
    select 1 from public.editorial_submissions
    where id = '20000000-0000-0000-0000-000000000003'
  ) then
    raise exception 'contract retained an invalid quarantined editorial submission';
  end if;
  if not exists (
    select 1 from public.editorial_submissions
    where id = '20000000-0000-0000-0000-000000000004'
  ) then
    raise exception 'contract removed the valid write accepted during expand';
  end if;
end;
$$;
