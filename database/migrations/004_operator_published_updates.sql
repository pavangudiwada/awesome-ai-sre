alter table public.published_updates
  alter column content_path drop not null,
  add column if not exists retired_at timestamptz;

alter table public.published_updates
  drop constraint if exists published_updates_content_path_internal,
  add constraint published_updates_content_path_internal check (
    content_path is null or content_path ~ '^/updates/[a-z0-9]+(?:-[a-z0-9]+)*$'
  );

create index if not exists published_updates_active_published_idx
  on public.published_updates(published_at desc) where retired_at is null;
