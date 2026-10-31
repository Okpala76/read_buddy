# Notification panel — Batch 1/6

The protected app header has a bell with an unread badge and a right-side panel on desktop and mobile. There is no Notifications navigation entry. Old `/notifications` links redirect to the dashboard and open the panel. The accessible panel uses the existing Radix sheet for focus trapping, Escape dismissal, and focus return.

The feed combines nudges, congratulations, reactions, pending friend and streak invitations, accepted-friend milestones awaiting congratulations, and reading-time reminders. Read receipts are scoped to the authenticated viewer. The count covers the full feed, independently of the visible list (initially 50, loadable to 500). Invitations disappear after being handled. No book titles or page counts appear in the feed.

The bell refreshes every 30 seconds while the app is visible, on focus, on panel open, and after actions. Newly received activity produces a brief in-app alert. This is bounded polling rather than WebSockets. Existing OS push/email delivery remains separate and permission-based.

In-app encouragement has no on/off switches. The retired settings action and screen are removed; migration 0021 resets historical flags, and nudge/milestone eligibility no longer consults them. Accepted friendships, active partnerships, sender/recipient daily limits, and reading eligibility remain unchanged.

Reading-time reminders are materialized once per local day when the visible app refreshes after the effective configured reading time. This works even if external reminder delivery is disabled. No active reading book or an already completed reading day produces no reminder. The effective-time calculation retains timezone/adaptive/quiet-hour behavior. Closed-app push delivery continues through the existing reminder scheduler; this panel does not add another cron job.

Deploy migration `0021_notification_panel` through the existing production reconciliation before app deployment. It adds receipt and reminder tables without modifying historical migrations. Run pnpm verify and the PostgreSQL CI integration tests before merge.

Production check: open/close the bell on mobile/desktop; check unread counts and persistent read status; follow invitations/milestones to Friends; react to encouragement; verify reading-time reminders and background/foreground refresh. No notification opt-out controls should remain in the panel.
