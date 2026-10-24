# Reviewed Global Updates

The public `/updates` feed combines a reviewable file-backed news selection in
`data/reviewed-news.json` with eligible rows from `public.published_updates`.
It does not read sessions, follows, saves, notes, evaluations, or update-read
state. The Bell consumes the same public merge and shows its latest 12 events.
Authenticated read state and company-follow labels are added afterward using
only the verified session subject; the underlying authorization is unchanged.

## Research and date boundaries

The October 15, 2026 candidate contains 26 events:

- 11 newly source-checked records across Rootly, Komodor, PagerDuty, Grafana,
  Datadog, and Ciroos
- 15 records reconstructed from the October 14 candidate's retained dated
  public-source ledger, with deliberately concise summaries. This is a fresh
  reconstruction, not recovery or reuse of the unavailable earlier source
  archive. Every record links the original public announcement or release note
- The reconstructed Traversal $48M announcement date was corrected to June 19,
  2025 after checking its first-party Resource Hub listing, which links the exact
  launch announcement. The article itself has no visible date; the listing is
  retained as a separate date source. Funding close dates remain unknown
- The disputed Sedai funding date is excluded

`reviewedAt` records review preparation, not live publication. The candidate
becomes visible only if this application change is subsequently released.
The research marker does not establish catalog capability evidence, endorse
vendor claims, or label the associated product verified.

`announcedAt` is the public source's date. `eventDate` is nullable and used only
when the actual availability or effective-change date is separately established.
Funding close dates remain unknown. PagerDuty's August 5 rollout summary also
keeps the actual event date unknown. No announcement date is inferred from a
Watchlist publication timestamp.

This is a curated selection, not an exhaustive archive or continuous monitoring
service. Follow the source for current access and availability conditions.

## Merge and failure behavior

- Reviewed JSON is validated with strict Zod objects, calendar-date validation,
  unique slugs, an explicit review marker, and HTTPS-only public sources without
  embedded credentials
- Future announcements/reviews and scheduled DB publications are excluded
- The server-only DB query selects public publication fields and excludes retired
  or future rows. It never mutates the database
- File-backed events win over mirrored DB rows by slug or canonical source.
  Tracking decorations are ignored; meaningful query parameters are preserved.
  A matching eligible DB publication retains its real UUID/company relation for
  Bell read-state lookup while the reviewed file title/date/category remain intact.
  Source/content eligibility is checked before attaching a publication UUID;
  removed/draft local articles cannot add read state to a valid file story
- A source can explicitly be a rolling timeline. Separate events, including
  distinct normalized headlines on the same date, survive. A distinct DB
  headline is preserved instead of being silently
  discarded just because it uses the same changelog URL
- Removed/draft local MDX rows, mismatched local paths, and source-less rows
  without a real published article are not linked
- Malformed DB rows are omitted with a partial-publication notice. Database
  failure retains the file-backed feed and shows a recoverable unavailable
  notice. The retry form makes a fresh page request; failures are not cached as
  empty publication history
- Legacy DB rows show their Watchlist publication date and unknown source/event
  dates rather than inventing announcement chronology

No database-schema changes, data migration, publication sync, or deployment are
part of this feature. File-only Bell identities use `news:<slug>` and never have
unread state or invoke mark-read. Only genuine UUID notifications can invoke the
existing authenticated mark-read action. The client validates those identities,
and the action still rejects non-UUID IDs before authentication or a DB write.

The header API remains private/no-store with `Vary: Cookie`. Public news is not
removed when personalization fails; it returns no viewer or guessed read state,
shows an explicit degraded notice, and labels the account temporarily unavailable.
Publication outages are not cached as empty feeds. Followed-company highlighting
uses explicit reviewed catalog-company slugs when present, then the DB company
relation or an exact catalog-name fallback. Followed items have a visible
Followed company badge. Following does not filter the global feed.

News remains independent editorial content unless a reviewed company mapping is
present. Mapped stories use catalog company identities for follow highlighting;
unmapped stories retain source-backed display names without creating company
profiles or foreign-key identities.

## Checks

Focused unit coverage exercises data validation, date distinctions, chronological
ordering, source/slug deduplication, rolling sources, future/draft filtering,
public-only projection, outage/partial/recovery states, and the rendered page.
The Updates browser case covers public news, source target sizing, year-anchor
navigation, Back, and reload on desktop and 390px mobile projects. Run the full
repository release checks before publication; passing unit tests alone is not
visual or live-database evidence.

## Verification limits

Bell identity, fallback, private-query scoping, and read-action authorization are
covered by focused tests with mocked storage/session boundaries. They do not
establish live database delivery or live authentication behavior. Interactive
desktop/mobile browser checks and screenshots remain blocked by this execution
environment's socket/browser restrictions; run those gates in an authorized
browser-capable environment before release. No production DB was read or written
while reconstructing this feature.
