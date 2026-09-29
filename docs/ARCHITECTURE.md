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
- Route Handlers are reserved for actual HTTP boundaries: Auth.js callbacks, Vercel Cron, and provider webhooks.
- Errors are translated at the outer boundary; domain/application code does not depend on Next.js response types.

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

Use Auth.js with its Drizzle adapter and database sessions in phase 2. Begin with a single OAuth provider selected for the deployment, map Auth.js to the existing `users` table, and add the adapter's accounts, sessions, and verification-token tables in a reviewed migration. Every application query uses the server-validated session user ID; email is not an authorization key.

This foundation intentionally does not install or configure Auth.js before phase 2, because provider credentials and adapter tables should land together and be tested as one vertical slice.

## Redis decision

Do not use Redis in V1. PostgreSQL is sufficient for uniqueness, transactions, reminder idempotency, and initial analytics. Add Redis only after a measured requirement such as cross-instance rate limiting or queue throughput that cannot reasonably be met with PostgreSQL and the deployment platform.

## Architectural decisions

- Modular monolith over microservices.
- Server-first App Router rendering; client components only where interaction requires them.
- PostgreSQL constraints plus transactional use cases for critical invariants.
- Historical sessions as the source for analytics; no duplicate counters.
- UTC persistence with IANA timezone conversion at application boundaries.
- Database sessions for revocation and server-side authorization.
