-- Contract phase: run only after the staged application has successfully
-- received production traffic. Locks close the race between remediation and
-- constraint validation while old requests drain.
lock table public.practitioner_profiles in access exclusive mode;
lock table public.evaluations in access exclusive mode;
lock table public.evaluation_products in access exclusive mode;
lock table public.product_notes in access exclusive mode;
lock table public.editorial_submissions in access exclusive mode;

insert into private.workflow_text_quarantine (
  entity_type,
  entity_key,
  field_name,
  original_value,
  retained_value,
  reason
)
select
  'evaluation',
  jsonb_build_object('id', id, 'practitioner_id', practitioner_id),
  field_name,
  original_value,
  case field_name
    when 'goal' then left(btrim(original_value), 4000)
    else left(btrim(original_value), 8000)
  end,
  'legacy_value_exceeded_current_limit'
from public.evaluations
cross join lateral (
  values
    ('goal', goal, 4000),
    ('requirements', requirements, 8000),
    ('risks', risks, 8000)
) as legacy_field(field_name, original_value, maximum_length)
where original_value is not null
  and length(original_value) > maximum_length;

update public.evaluations
set goal = case
      when goal is not null and length(goal) > 4000 then left(btrim(goal), 4000)
      else goal
    end,
    requirements = case
      when requirements is not null and length(requirements) > 8000
        then left(btrim(requirements), 8000)
      else requirements
    end,
    risks = case
      when risks is not null and length(risks) > 8000 then left(btrim(risks), 8000)
      else risks
    end;

insert into private.workflow_text_quarantine (
  entity_type,
  entity_key,
  field_name,
  original_value,
  retained_value,
  reason
)
select
  'product_note',
  jsonb_build_object(
    'practitioner_id', practitioner_id,
    'product_slug', product_slug
  ),
  'body',
  body,
  left(btrim(body), 20000),
  'legacy_value_exceeded_current_limit'
from public.product_notes
where length(btrim(body)) > 20000;

update public.product_notes
set body = left(btrim(body), 20000)
where length(btrim(body)) > 20000;

insert into private.editorial_submission_quarantine (
  submission_id,
  submission_payload,
  reasons
)
select
  submission_row.id,
  to_jsonb(submission_row),
  array_remove(array[
    case
      when length(submission_row.source_url) > 2000
        then 'source_url_exceeded_current_limit'
      when submission_row.source_url !~* '^https?://'
        then 'source_url_is_not_http'
    end,
    case
      when length(btrim(submission_row.message)) < 20
        then 'message_below_current_minimum'
      when length(btrim(submission_row.message)) > 10000
        then 'message_exceeded_current_limit'
    end,
    case
      when length(submission_row.contact_email) > 320
        then 'contact_email_exceeded_current_limit'
      when submission_row.contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        then 'contact_email_is_invalid'
    end
  ], null)::text[]
from public.editorial_submissions as submission_row
where length(submission_row.source_url) > 2000
  or submission_row.source_url !~* '^https?://'
  or length(btrim(submission_row.message)) not between 20 and 10000
  or length(submission_row.contact_email) > 320
  or submission_row.contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$';

delete from public.editorial_submissions as submission_row
where exists (
  select 1
  from private.editorial_submission_quarantine as quarantine
  where quarantine.submission_id = submission_row.id
);

update public.practitioner_profiles
set display_name = nullif(left(btrim(display_name), 120), ''),
    role = left(btrim(role), 120),
    organization = left(btrim(organization), 160);

update public.evaluations
set name = case when btrim(name) = '' then 'Untitled evaluation' else left(btrim(name), 120) end,
    decision = case
      when decision in ('undecided', 'advance', 'hold', 'reject') then decision
      else 'undecided'
    end;

delete from public.product_notes where btrim(body) = '';

alter table public.practitioner_profiles
  add constraint practitioner_profiles_display_name_bounds check (
    display_name is null or length(btrim(display_name)) between 1 and 120
  ),
  add constraint practitioner_profiles_role_bounds check (
    role is null or length(role) <= 120
  ),
  add constraint practitioner_profiles_organization_bounds check (
    organization is null or length(organization) <= 160
  );

alter table public.evaluations
  alter column decision set default 'undecided',
  alter column decision set not null,
  add constraint evaluations_name_bounds check (
    length(btrim(name)) between 1 and 120
  ),
  add constraint evaluations_goal_bounds check (
    goal is null or length(goal) <= 4000
  ),
  add constraint evaluations_requirements_bounds check (
    requirements is null or length(requirements) <= 8000
  ),
  add constraint evaluations_risks_bounds check (
    risks is null or length(risks) <= 8000
  ),
  add constraint evaluations_decision_allowed check (
    decision in ('undecided', 'advance', 'hold', 'reject')
  );

alter table public.product_notes
  add constraint product_notes_body_bounds check (
    length(btrim(body)) between 1 and 20000
  );

alter table public.editorial_submissions
  add constraint editorial_submissions_source_url_bounds check (
    length(source_url) <= 2000 and source_url ~* '^https?://'
  ),
  add constraint editorial_submissions_message_bounds check (
    length(btrim(message)) between 20 and 10000
  ),
  add constraint editorial_submissions_contact_email_bounds check (
    length(contact_email) <= 320
    and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  );

create trigger evaluations_enforce_row_quota
  before insert on public.evaluations
  for each row execute function private.enforce_workflow_row_quota();

create trigger product_notes_enforce_row_quota
  before insert on public.product_notes
  for each row execute function private.enforce_workflow_row_quota();

create trigger evaluation_products_enforce_row_quota
  before insert on public.evaluation_products
  for each row execute function private.enforce_workflow_row_quota();

drop policy if exists "Visitors can submit editorial corrections"
  on public.editorial_submissions;
drop policy if exists "Practitioners can submit editorial corrections"
  on public.editorial_submissions;
revoke all on table public.editorial_submissions from public, anon, authenticated;
revoke insert (
  submission_type,
  relationship,
  product_slug,
  company_slug,
  source_url,
  message,
  contact_email
) on table public.editorial_submissions from anon, authenticated;
