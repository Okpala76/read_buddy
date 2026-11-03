# Independent reading reminder channels

New daily and streak-rescue occurrences schedule independent EMAIL and PUSH targets. Email is enabled by default; existing explicit opt-outs are preserved. Email opt-out is checked before every attempt, including retries, without disabling push. Reading eligibility, timezones, quiet hours, and the master reminder preference are unchanged.

Each target has its own row, provider attempt count, result, retry schedule, and stable idempotency key. Database uniqueness covers user, scheduled instant, notification kind, and target. A successful channel is not replayed when the other retries. Targeted push never falls back to email because an independent email target already exists. Delivery history labels both targets, including skipped entries.

Deploy committed migration 0024_independent_reminder_channels through the existing production reconciliation before releasing the app. Historical rows are marked LEGACY and continue the original channel/retry rules (while honoring email opt-out). New scheduling does not replay any occurrence with a historical row. No old settings or delivery history are deleted or reset. During the migration/app cutover, the old worker may fail its obsolete conflict-index lookup; the next five-minute cycle on the new release resumes scheduling within the existing fifteen-minute grace period.

Validation includes dual-channel dispatch, independent retries, email opt-out, push lookup failures, duplicate prevention, historical occurrence preservation, and PostgreSQL concurrent inserts/claim settlement.
