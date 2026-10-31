# Reading Buddies — Batch 5/6

Milestones at 10, 50, and 100 consecutive reading days produce optional congratulations prompts on Friends. All accepted friends qualify; a streak partnership is not required. Messages use predefined copy. Nothing is sent automatically by opening the page.

Physical and PDF session completion share the milestone recorder. Distinct calendar dates in the reader's IANA timezone determine the streak. Repeated sessions do not add streak days. A restarted streak can earn the milestones again. Only reading saved after deployment produces events; existing history is used to calculate the streak, but past milestones are not backfilled.

## Deployment

Apply committed migration `0019_streak_milestones` before deploying the code. The existing production CD migration reconciliation, backup, and health checks remain authoritative. Do not use schema push or edit historical migrations.

The database enforces one event per reader/local day and one congratulations per sender/event. Sending requires a current accepted friendship, locked during delivery. Prompts are limited to the viewer's friends, and received messages are scoped to the authenticated milestone owner. Ending a friendship hides its prompts and prevents future sends; already received messages remain in the recipient's history.

## Validation

Run `pnpm verify` in UTC, matching CI. The database CI job also runs milestone authorization/concurrency tests against PostgreSQL after applying all committed migrations and checking production reconciliation.

In production, save a qualifying physical or PDF session at a milestone. An accepted friend should see a Congratulate action on Friends. A click should deliver one predefined message, disable repeated sends, and show the message in the reader's Friends page. Unrelated users must not see the milestone or be able to send to it.
