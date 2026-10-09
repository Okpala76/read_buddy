# Architecture

## System shape

Read Buddy is a modular monolith: one Next.js App Router deployment on Vercel and one PostgreSQL database on a VPS. PgBouncer protects PostgreSQL from serverless connection fan-out. This avoids a separate backend and keeps transactions close to the application use cases that need them.

```text
Browser
  |
Vercel: Next.js App Router
  | TLS
VPS: PgBouncer (transaction pooling)
  |
PostgreSQL
```

Local development runs `pnpm dev` on the host and PostgreSQL in Docker Compose. The application connects directly to PostgreSQL locally.

## Code boundaries

```text
src/
|-- app/                         # routing, layouts, HTTP boundaries
|-- features/
|   |-- auth/
|   |-- books/
|   |-- reading/
|   |-- analytics/
|   `-- reminders/
|-- components/ui/               # reusable shadcn/ui primitives
|-- config/                       # validated runtime configuration
|-- db/
|   |-- schema/
|   |-- migrations/
|   `-- client.ts
|-- lib/                          # framework-neutral shared utilities
`-- test/
```

Features add only the layers they need:

- `domain`: entities, value objects, and pure business rules. No React, Next.js, Drizzle, or database imports.
- `application`: use cases and interfaces for persistence/external effects.
- `infrastructure`: Drizzle repositories and provider adapters.
- `ui`: components, view models, and Server Action adapters.

Dependencies point inward: UI and infrastructure depend on application/domain contracts; the domain depends on neither. Avoid abstract repository layers for simple reads. Add an interface where a transaction, provider, or test seam needs one.

## Request and mutation paths

- Server Components read through feature application queries backed by infrastructure implementations.
- Client Components receive serializable data and do not import the database client.
- Internal authenticated mutations use Server Actions that validate input with Zod, resolve the authenticated user, and invoke one application use case.
- Route Handlers are reserved for actual HTTP boundaries such as Vercel Cron and provider webhooks.
- Errors are translated at the outer boundary; domain/application code does not depend on Next.js response types.
- TanStack Query is route-scoped to client-owned data that changes out of band. Reminder delivery history uses intent prefetch and conditional polling; core page data remains server-rendered and private query data is never persisted offline.

## Reading transaction

The future `logReadingSession` use case must execute in one database transaction:

1. Select the user-owned `READING` book `FOR UPDATE`.
2. Validate submitted pages as a positive integer.
3. Set `startPage` to the locked book's current page.
4. Set `endPage` to `min(startPage + submittedPages, totalPages)`.
5. Set `pagesRead` to `endPage - startPage` and reject a zero result.
6. Insert `reading_sessions(startPage, endPage, pagesRead, ...)`.
7. Update the book's current page; when it reaches total pages, set status to `COMPLETED` and `completedAt` in the same statement.

The database checks protect stored invariants, and row locking prevents concurrent submissions from creating overlapping ranges.

## Authentication decision

Use Clerk for authentication. Clerk middleware protects product routes, and server-side Clerk APIs validate the active identity. The application maps `users.clerk_user_id` to the existing PostgreSQL UUID primary key before invoking a use case, so all ownership queries continue to use the local UUID. A verified primary email is required to provision a local user; email is never used as an authorization key.

The legacy Auth.js adapter tables remain in the schema during the Clerk cutover so rollback does not require data recovery. They can be removed later through a separately reviewed cleanup migration after the rollback window closes.

## Redis decision

Do not use Redis in V1. PostgreSQL is sufficient for uniqueness, transactions, reminder idempotency, and initial analytics. Add Redis only after a measured requirement such as cross-instance rate limiting or queue throughput that cannot reasonably be met with PostgreSQL and the deployment platform.

## Architectural decisions

- Modular monolith over microservices.
- Server-first App Router rendering; client components only where interaction requires them.
- PostgreSQL constraints plus transactional use cases for critical invariants.
- Historical sessions as the source for analytics; no duplicate counters.
- UTC persistence with IANA timezone conversion at application boundaries.
- Clerk-managed sessions with server-validated identity mapped to local UUID authorization.

## Notification decision engine (Phase 2B)

The VPS cron invokes `/api/cron/reminders` every five minutes. The orchestration flow is:

```text
VPS cron (5 min)
   ↓
GET /api/cron/reminders
   ↓
Schedule due occurrences  (idempotent by user_id + scheduled_for)
   ↓
Recover stale claims     (10 min lease)
   ↓
Claim ready deliveries   (FOR UPDATE SKIP LOCKED)
   ↓
Current-state eligibility (reminders enabled, not read today, active book)
   ↓
NotificationDecisionEngine
   ├── PUSH   (active push subscriptions + push intent)
   ├── EMAIL  (fallback)
   └── SKIP   (eligibility failure or no enabled channel)
   ↓
Provider dispatch (Resend or Web Push)
```

Key properties:

- **Single logical reminder = single delivery row**. Channel is decided once, persisted as `delivery_channel`, and reused on retries. No cross-channel duplication.
- **Push fan-out is aggregate**: one logical PUSH delivery attempts all active user subscriptions; at least one accepted = SENT. Gone endpoints are revoked; temporary failures retained.
- **Email fallback is pre-dispatch only**: occurs when no active push subscriptions exist, or an all-gone fan-out is detected. A partial push success never triggers email.
- **Idempotency**: Resend uses `reading-reminder/<delivery-id>`; Web Push uses stable `tag` (notification replacement, not provider-level exactly-once).
- **Retry**: existing email policy (3 attempts, 5/30 min) preserved. Push fan-out retries per-target with same window; logical retry only when no target succeeded.
- **Tenant isolation**: all queries scoped to authenticated internal UUID. No caller-supplied user IDs.
