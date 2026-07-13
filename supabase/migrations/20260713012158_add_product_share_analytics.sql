-- Product-share analytics records the aggregate action only. Destination,
-- channel, share text, URL, user identity, notes, and search content are not
-- represented in this schema and cannot be inserted as event properties.
alter table private.analytics_events
  drop constraint analytics_events_event_type,
  add constraint analytics_events_event_type check (
    event_type in ('profile_view', 'outbound_click', 'update_view', 'share')
  );

alter table private.analytics_events
  drop constraint analytics_events_event_subject_pair,
  add constraint analytics_events_event_subject_pair check (
    (event_type = 'profile_view' and subject_kind in ('product', 'company'))
    or event_type = 'outbound_click'
    or (event_type = 'update_view' and subject_kind = 'update')
    or (event_type = 'share' and subject_kind = 'product')
  );
