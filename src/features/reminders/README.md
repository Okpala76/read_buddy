# Reminders feature

Owns reminder scheduling policy and delivery tracking. External cron and email provider calls enter through explicit infrastructure boundaries.

`reminder_time` is the user's local wall-clock time. `users.timezone` is a validated IANA timezone such as `Africa/Lagos` or `America/Toronto`. The scheduler converts that local occurrence to the UTC instant stored in `reminder_deliveries.scheduled_for`.

The scheduler accepts occurrences that are due and no more than 15 minutes old. Atomic `INSERT ... ON CONFLICT DO NOTHING` creation uses the `(user_id, scheduled_for)` unique index, so repeated scheduling calls retain one delivery per occurrence.

Scheduling is timezone-aware and idempotent.

## Dispatch state machine

```text
PENDING -> PROCESSING -> SENT
                      -> FAILED -> PROCESSING (when retry is due)
                      -> SKIPPED
```

Workers claim at most 50 due `PENDING` rows or retryable `FAILED` rows in a PostgreSQL transaction using `FOR UPDATE SKIP LOCKED`, then update those rows to `PROCESSING` with `locked_at`. Final writes require both the `PROCESSING` state and the original `locked_at` value, preventing an expired worker from overwriting a newer claim. Claims older than 10 minutes return to their pre-claim state based on whether a provider attempt already exists; claiming and recovery do not increment `attempt_count`.

Immediately before sending, dispatch re-checks current preference, reading, and book state. Deliveries are skipped with `REMINDERS_DISABLED`, `ALREADY_READ_TODAY`, or `NO_ACTIVE_BOOK`. Reading-day bounds are calculated in the user's IANA timezone and converted to UTC before querying `reading_sessions`.

`attempt_count` records provider calls only. Pre-send skips do not increment it; provider success and provider failure each add one. Retryable failures wait 5 minutes after attempt one and 30 minutes after attempt two. Attempt three and permanent failures are terminal.

The Resend adapter uses `reading-reminder/<delivery-id>` as the deterministic provider idempotency key. Recipient, book progress, and target values are snapshotted when the delivery is scheduled so retries reproduce the same logical payload. See `docs/REMINDERS.md` for provider semantics and operational details. The feature is not production-ready until Batch 5 configures production environment variables and cron scheduling.
