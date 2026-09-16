# Reviewing release-feed candidates

`npm run collect:review-candidates` fetches only the explicitly allowlisted,
first-party GitHub release Atom feeds in `config/review-feed-sources.json` and
writes sanitized, deterministic candidate records to
`data/review-queue/release-candidates.json`.

Candidates are not published updates. The daily workflow may commit that review
queue file and uploads it as an artifact, but it never changes catalog YAML,
MDX, or PostgreSQL. An editor must verify the first-party source and create or
update reviewed content separately before an item can appear on the public
updates feed or newsletter digest.
