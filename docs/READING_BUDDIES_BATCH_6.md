# Reading Buddies — Batch 6/6

Notifications brings daily nudges, milestone congratulations, and emoji reactions into one authenticated in-app inbox. Navigation is available on desktop and mobile. Pending friend and streak invitations link to Friends for the existing accept/decline flows. Friends keeps milestone congratulations prompts and relationship management; received encouragement now lives in Notifications.

Recipients can mark a message read and react with ❤️, 👏, or 🙌. The original sender sees the reaction in their own notification center. Repeating the same reaction is idempotent and does not reopen the sender's unread item; selecting a different reaction updates that item. Reactions cannot receive further reactions. No free-text messaging is introduced.

## Privacy and limits

The Notifications page includes explicit saved settings for receiving daily nudges and sharing milestones. Defaults preserve the already enabled buddy behavior. Disabling nudges excludes the recipient from future deliveries. Disabling milestone sharing hides their prompts from friends and rejects stale congratulations requests. Delivery and preference updates serialize on the recipient's user row. Historical messages remain in their recipient's private history. Notifications contain names, predefined encouragement, milestone length, and timestamps, never book titles, authors, or page counts.

Only the recipient can mark a received message read or react; only the original sender can mark the reaction notification read. Reactions additionally require a current accepted friendship. Existing one-sender-day batches and one-recipient-local-day nudge uniqueness remain authoritative in PostgreSQL. Active streak partnerships are locked while selecting eligible nudge recipients, preserving pause/end behavior during delivery.

The center displays the latest 100 items from bounded source queries; unread count describes those loaded items. Older data is retained. Invitations are current pending actions and are not marked read through message controls. There is no background polling or external email/push delivery in this batch.

## Deployment and verification

Apply committed migration `0020_social_notifications` through production CD before deploying the app. It adds privacy preferences and nullable delivery read/reaction metadata; existing messages remain intact and initially unread. Historical migrations and deployment safeguards are unchanged.

Run `pnpm verify` in UTC as CI does. PostgreSQL integration CI covers concurrent sender/recipient nudges, recipient-local already-read filtering across UTC midnight, opt-outs, paused/ended relationships, private inbox ownership, reaction feedback/idempotency, unified delivery, and hidden milestone prompts, alongside existing migration and concurrency tests.

Production smoke checks: open Notifications on mobile and desktop; receive a nudge and a milestone congratulations; mark one read and refresh; react and verify the original sender sees it; repeat the reaction without duplicate unread feedback. Save each privacy toggle and confirm the next sender action respects it. Confirm unrelated accounts cannot read or mutate the messages. Confirm production CD applied `0020` and passed the release health check.
