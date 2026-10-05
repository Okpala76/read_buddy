# Reminder Delivery

Reminder delivery is implemented through Resend, behind the application-layer `ReminderEmailSender` port. The official `resend` Node SDK is used only by the infrastructure adapter.

The Resend sending domain and required Vercel production variables are configured. VPS cron installation, `CRON_SECRET`, production migration application, and deployment belong to Batch 5.

## Sender Configuration

- Preferred domain: `read-buddy.ogalandlord.com.ng`
- Preferred sender: `Reading Buddy <reminders@read-buddy.ogalandlord.com.ng>`
- Required runtime variables: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `NEXT_PUBLIC_APP_URL`
- Empty optional variables are normalized to `undefined` so build-time validation remains safe.
- The production API key uses Resend `sending_access` and is restricted to the sending domain.

The Resend CLI is the supported tool for inspecting and verifying the account and domain. Domain creation or verification must not be reported as successful until the authenticated CLI confirms it.

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

`SENT` means Resend accepted the request. It does not guarantee inbox delivery. Delivery, bounce, complaint, and delayed-delivery webhooks are a future enhancement and are not implemented in Batch 4.
