# Reminder Delivery

Reminder delivery is implemented through Resend and Web Push, behind the application-layer `ReminderEmailSender` and `ReminderPushSender` ports. The official `resend` Node SDK is used only by the email infrastructure adapter; `web-push` is used only by the push infrastructure adapter.

The Resend sending domain, Vercel production variables, production migrations, and VPS scheduler are configured.

## Notification Decision Engine

Phase 2B introduces a unified notification decision engine that evaluates each due reminder occurrence and selects exactly one delivery channel:

1. **Eligibility (existing, unchanged)**
   - Reminders globally disabled → `SKIP` / `REMINDERS_DISABLED`
   - User already read today → `SKIP` / `ALREADY_READ_TODAY`
   - No active reading book → `SKIP` / `NO_ACTIVE_BOOK`

2. **Channel precedence**
   - Push enabled **and** at least one valid active push subscription → `PUSH`
   - Otherwise, email enabled → `EMAIL`
   - Otherwise → `SKIP` / `NO_ENABLED_CHANNEL`

The decision engine is a pure TypeScript class in `src/features/reminders/domain/notification-decision.ts` with no external dependencies.

**Push availability** requires both the account-level push preference (`push_reminder_intent = ENABLED`) and at least one active, non-revoked subscription in `push_subscriptions`. Stale browser subscriptions (rotated VAPID key) are detected and replaced only from the explicit enable action.

**Channel persistence**: once a channel is selected for a logical reminder, it is written to `reminder_deliveries.delivery_channel` before any provider call. Retries reuse the stored channel; the engine does not re-evaluate channel choice on retry. The only cross-channel transition is an immediate PUSH→EMAIL fallback when a fan-out discovers **zero** active subscriptions and **all** are permanently gone — this happens **before** any provider attempt, so no push call is made.

**Multi-device fan-out**: a single logical reminder occurrence fans to all active push subscriptions for that user. Each device is attempted independently. The logical delivery is `SENT` if at least one device accepts; `404`/`410` revokes that subscription; temporary failures retain the subscription for the next reminder. No per-endpoint history or endpoint data is stored in `reminder_deliveries`.

**Email fallback** occurs only at initial channel selection when no usable push subscription exists, or during the all-gone fan-out fallback. A partial push success never triggers email.

**Retry semantics**: existing email retry policy is unchanged (3 attempts, 5/30-minute delays, idempotency key per delivery). Push fan-out uses the same retry window per target; the logical delivery retries only when no target was accepted and at least one temporary failure occurred. `attempt_count` counts provider outcomes only.

## Sender Configuration

- Preferred domain: `read-buddy.ogalandlord.com.ng`
- Preferred sender: `Reading Buddy <reminders@read-buddy.ogalandlord.com.ng>`
- Required runtime variables: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`, VAPID tuple (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)
- Empty optional variables are normalized to `undefined` so build-time validation remains safe.
- The production API key uses Resend `sending_access` and is restricted to the sending domain.

The Resend CLI is the supported tool for inspecting and verifying the account and domain. Domain creation or verification must not be reported as successful until the authenticated CLI confirms it.

## Production Scheduling

- Preferred domain: `read-buddy.ogalandlord.com.ng`
- Preferred sender: `Reading Buddy <reminders@read-buddy.ogalandlord.com.ng>`
- Required runtime variables: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `NEXT_PUBLIC_APP_URL`
- Empty optional variables are normalized to `undefined` so build-time validation remains safe.
- The production API key uses Resend `sending_access` and is restricted to the sending domain.

The Resend CLI is the supported tool for inspecting and verifying the account and domain. Domain creation or verification must not be reported as successful until the authenticated CLI confirms it.

## Production Scheduling

The gochi VPS invokes `GET /api/cron/reminders` every five minutes. The endpoint requires `Authorization: Bearer <CRON_SECRET>` and performs scheduling, stale-claim recovery, atomic claiming, current-state eligibility checks, and dispatch. The VPS calls the canonical custom domain directly so an HTTP redirect cannot strip the authorization header.

The scheduler installation is intentionally small and does not require a repository checkout, Node.js process, or additional container:

- Secret environment file: `/home/gochi/read_buddy/secrets/reminder-cron.env`, mode `600`
- Invocation script: `/home/gochi/read_buddy/scripts/run-reminder-cron.sh`, mode `700`
- Schedule: every five minutes under the gochi user's crontab
- Overlap protection: `/usr/bin/flock -n /tmp/read-buddy-reminders.lock`
- Operational log tag: `read-buddy-reminders`

The script uses strict shell behavior, HTTPS, connection and request timeouts, curl failure handling, and concise success/failure messages. It must never print the authorization header, secret value, recipient address, or response body during normal cron execution.

## Operations

Run one scheduler cycle from the VPS without exposing the secret:

```sh
/home/gochi/read_buddy/scripts/run-reminder-cron.sh
```

Inspect recent scheduler outcomes:

```sh
journalctl -t read-buddy-reminders --since "1 hour ago" --no-pager
```

To safely stop all scheduled sends while preserving user settings and delivery history, comment out or remove only the reminder line with `crontab -e`. To stop reminders for one account, disable reminders in the application's Reminders settings. Do not delete historical delivery rows.

If invocation fails, check in this order:

1. Confirm the canonical application URL responds over HTTPS.
2. Check `journalctl` for the script's HTTP status or curl failure category.
3. Confirm the secret and script permissions remain `600` and `700` respectively.
4. Confirm Vercel Production has `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `NEXT_PUBLIC_APP_URL` without printing their values.
5. Inspect Vercel function logs and tenant-scoped delivery history. Never place secrets, raw provider responses, or recipient addresses in tickets or logs.

## Deterministic Requests

Each delivery snapshots the recipient email, book title, current/total pages, and daily page target when it is scheduled. Retries render subject, HTML, and text from that snapshot rather than mutable user or book state.

The provider idempotency key is:

```text
reading-reminder/<reminder-delivery-id>
```

Every attempt for one delivery uses the same key and payload. Resend provides duplicate suppression for accepted requests retried with that key. Resend currently retains idempotency keys for 24 hours; the configured retry window completes within 35 minutes.

## Retry Policy

The maximum is three actual provider calls:

| Failed attempt | Result                             |
| -------------- | ---------------------------------- |
| 1              | `FAILED`, retry in 5 minutes       |
| 2              | `FAILED`, retry in 30 minutes      |
| 3              | Terminal `FAILED`, no next attempt |

Permanent failures become terminal immediately. Retryable `FAILED` rows are claimable only when `next_attempt_at <= now` and `attempt_count < 3`. Claims continue to use PostgreSQL row locks with `FOR UPDATE SKIP LOCKED`.

Before every retry, the worker re-checks whether reminders remain enabled, the user has already read during their current IANA-timezone day, and an active book still exists. An ineligible retry becomes `SKIPPED` without another provider call.

`attempt_count` counts provider calls. Claiming, stale-lock recovery, eligibility checks, and pre-provider skips do not increment it.

## Failure Classification

Provider failures are reduced to sanitized operational codes. Raw provider messages, response bodies, stack traces, authorization headers, and email content are not persisted.

Retryable categories include network/timeout failures, rate limiting, temporary idempotency locks, and provider 5xx responses. Permanent categories include invalid requests, invalid idempotent payload reuse, authentication/permission failures, and missing local provider configuration.

Failure history is visible through `status`, `attempt_count`, `error_code`, and `next_attempt_at`. The delivery API does not expose the snapshotted recipient address.

## Acceptance Semantics

On Resend acceptance, the delivery stores `data.id` as `provider_message_id`, records `sent_at`, and clears `next_attempt_at`, `locked_at`, and `error_code`.

`SENT` means Resend accepted the request. It does not guarantee inbox delivery. Delivery, bounce, complaint, and delayed-delivery webhooks are a future enhancement and are not implemented.

The production acceptance check observed one scheduled occurrence remain one database row with `attempt_count = 1` across subsequent scheduler cycles. Resend independently reported its terminal event as `delivered`. Live forced retry, stress, and skip scenarios were intentionally not performed against production; automated tests cover those paths.
