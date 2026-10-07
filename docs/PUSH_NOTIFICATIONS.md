# Push Notifications

PWA Phase 2A adds a standards-based Web Push foundation and a user-driven test
notification. It does not connect push delivery to daily reminders, email
fallback, streaks, adaptive timing, or the VPS cron.

PWA Phase 2B integrates Web Push with the existing email reminder system into a
unified notification decision engine. The decision engine evaluates each due
reminder occurrence and selects one channel: PUSH (preferred when an active
subscription exists), EMAIL (fallback when push is unavailable and email is
enabled), or SKIP (eligibility failure). No normal reminder is delivered by
both channels. Multi-device fan-out is aggregate: one logical reminder fans to
all active push subscriptions; at least one accepted device makes the logical
delivery SENT. Channel is persisted before provider dispatch and reused on
retries; temporary push failures stay PUSH; only an all-gone fan-out triggers
immediate email fallback before any provider attempt.

## Architecture

```text
Installed/browser Reading Buddy
        ↓
User clicks Enable notifications
        ↓
Notification permission
        ↓
PushManager subscription on the existing Serwist worker
        ↓
push_subscriptions
        ↓
PushNotificationSender
        ↓
Web Push service
        ↓
Existing Serwist service worker
        ↓
Operating-system notification
```

The browser UI is in
`src/features/push-notifications/ui/PushNotificationSettings.tsx`. Authenticated
Server Actions resolve Clerk identity to the internal Reading Buddy user UUID.
Application use cases define subscription and provider ports. Drizzle and
`web-push` implementations remain in the infrastructure layer.

The Node-only provider uses `web-push` 3.6.7. Push sending does not run in the
Edge runtime.

## VAPID

VAPID identifies Reading Buddy to browser push services. One key pair is reused
for all subscriptions. Rotating the pair can require users to enable
notifications again.

Environment variable names:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: public P-256 key supplied to `PushManager`.
- `VAPID_PRIVATE_KEY`: server-only private key.
- `VAPID_SUBJECT`: monitored contact URI,
  `mailto:reminders@read-buddy.ogalandlord.com.ng` in production.

The three values are an all-or-none configuration tuple. Environment validation
rejects partial configuration and invalid P-256 key lengths before the app
starts.

Generate a pair in a trusted shell with:

```bash
pnpm exec web-push generate-vapid-keys --json
```

Do not commit or log the generated values. Only the public key may enter the
browser bundle.

## Data Model

`push_subscriptions` contains:

- UUID primary key and internal `users.id` ownership FK.
- Globally unique push endpoint.
- `p256dh` and `auth` encryption keys.
- Optional browser user agent.
- Created, updated, last-used, and revoked timestamps.

Deleting a user cascades to their subscriptions. Endpoint and key material are
sensitive capability data: actions never return them as diagnostics, and the
application does not log them.

One user may own multiple active endpoints. Enabling notifications on a phone,
laptop, and tablet creates three records. Registration uses a database upsert on
the endpoint unique index, so reloads do not create duplicates.

## Ownership and Account Changes

The browser endpoint cannot be assigned by the caller to an arbitrary user.
Every action derives ownership from `requireAuth()` and the internal user UUID.

An endpoint is globally unique. If the same browser is used by another Reading
Buddy account, its atomic upsert reassigns the endpoint to the currently
authenticated user only when the submitted encryption keys match the stored
subscription. This proves possession of the browser subscription instead of
letting a caller claim a known endpoint. Same-user registration may refresh
rotated keys. The authenticated product shell silently reconciles an existing
granted browser subscription on load and whenever the Clerk session changes.
One transient reconciliation failure is retried. Reconciliation never requests
notification permission.

Phase 2A has no automated push sender, so a signed-out account cannot initiate a
test push. Future scheduled delivery must preserve this ownership strategy.

## Enable Flow

1. The settings card inspects browser support and current permission without
   prompting.
2. The user clicks **Enable notifications**.
3. Only that click may call `Notification.requestPermission()`.
4. If granted, the UI waits for the existing Serwist registration.
5. `PushManager.subscribe()` uses `userVisibleOnly: true` and the VAPID public
   key.
6. The authenticated registration action atomically stores or reassigns the
   endpoint.

If the deployed VAPID public key changes, Reading Buddy does not reuse the stale
browser subscription. The next explicit Enable action unsubscribes it and
creates a subscription for the current key.

Permission states:

- `default`: show the Enable button.
- `granted` with an active subscription: show Enabled and test/disable controls.
- `denied`: explain that notifications are blocked in browser settings and do
  not prompt repeatedly.

Permission is never requested on page load, login, install, or dashboard load.

## Test Push

**Send test notification** sends only to the subscription endpoint currently
held by that browser. The server confirms the endpoint is active and belongs to
the authenticated user before invoking the provider.

The Phase 2A payload is intentionally generic:

```json
{
  "title": "Reading Buddy",
  "body": "Notifications are working. We'll use them to help you stay consistent with your reading.",
  "url": "/dashboard",
  "tag": "reading-buddy-test"
}
```

It contains no book, reading-session, streak, or account data.

## Disable Flow

The normal Disable button affects only the current browser:

1. Call the browser subscription's `unsubscribe()` method.
2. Soft-revoke the matching authenticated user's database row by setting
   `revoked_at`.

Other devices remain active. If browser unsubscription succeeds but the server
request is interrupted, a later `404` or `410` response causes server cleanup.

## Invalid Subscriptions

- Push-service `404` and `410` responses soft-revoke the endpoint.
- `429`, `5xx`, timeout, and network failures retain the endpoint.
- Authentication/configuration errors retain the endpoint and return a safe
  failure result.
- Phase 2A has no retry queue.

The provider call has a 10-second socket timeout. Registration accepts only
HTTPS endpoints for supported standards push services: Firebase Cloud
Messaging, Mozilla Autopush, Apple Web Push, and Windows Notification Service.
This prevents an authenticated caller from using test push as an arbitrary
server-side request target.

## Service Worker

`src/app/sw.ts` remains the only service worker. Custom `push` and
`notificationclick` listeners are installed before
`serwist.addEventListeners()`.

Push payloads are treated as untrusted. Missing or malformed payloads receive a
safe Reading Buddy title, body, and `/dashboard` destination. Notifications use
the Reading Buddy icon.

On click, the worker closes the notification and resolves the destination
against the current origin. External, protocol-relative, and invalid URLs fall
back to `/dashboard`. An existing Reading Buddy window is navigated and focused;
otherwise the worker opens a new same-origin window.

## Browser Support

Web Push requires HTTPS, notification permission, service-worker support, and a
compatible browser. Desktop Chromium and installed Android PWAs are the primary
Phase 2A validation targets.

On supported iPhone and iPad versions, Web Push requires Reading Buddy to be
added to the Home Screen. Permission must then be requested from a direct user
interaction inside the installed web app. Ordinary Safari-tab behavior is not
equivalent to Android or desktop Chromium.

iOS physical-device Web Push verification remains pending when no physical
device is available.

## Troubleshooting

- Use `pnpm build && pnpm start`; service-worker registration is disabled under
  `pnpm dev`.
- Confirm `/serwist/sw.js` controls the page before enabling notifications.
- Confirm all three VAPID variables are configured and the public/private keys
  belong to the same pair.
- If permission is denied, re-enable notifications in browser site settings;
  Reading Buddy will not prompt again automatically.
- If a stale localhost worker interferes, unregister it and clear localhost site
  data through browser developer tools.
- A successful push-service response means the service accepted the message; it
  does not prove the operating system displayed it.

## Phase Boundary

PWA Phase 2B connects push delivery to the daily reminder cron. The VPS cron
invokes `/api/cron/reminders`, which runs the unified scheduling → claim →
eligibility → NotificationDecisionEngine → PUSH/EMAIL/SKIP flow. Email reminders
continue through the hardened Resend path. Phase 2C will add streak-aware
reminders, late-day rescue, adaptive timing, and streak rescue; these are not
present in Phase 2B.
