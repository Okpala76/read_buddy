# ReadOn R2 storage integration

## Decision

Use the existing Next.js App Router application on Vercel, PostgreSQL on the VPS, and the private Cloudflare R2 bucket `reading-buddy-books`. No additional backend service is required.

## Current infrastructure

- Production origin: https://read-buddy.ogalandlord.com.ng
- Development origin: http://localhost:3000
- R2 public managed domain: disabled; no custom public domains.
- R2 CORS: GET, HEAD, PUT for those two origins; Content-Type and Range request headers; ETag, Content-Length, Content-Range, Accept-Ranges response headers.
- Existing `book_documents` schema stores book ownership, format, storage key, original filename, MIME type, byte count and optional page count. Do not duplicate this table.

## Implementation contract

1. Add `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` with pnpm and commit the lockfile.
2. Define server-only validated environment variables `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME`; never use `NEXT_PUBLIC_` for secrets.
3. Create a server-only S3 client using region `auto` and endpoint `https://<account-id>.r2.cloudflarestorage.com`.
4. In `src/features/books` or a dedicated `src/features/book-documents` feature, implement authenticated upload initiation as a Server Action. Resolve Clerk identity to the application UUID, confirm ownership of the target book, validate PDF/EPUB type and configured maximum size, and generate an unpredictable user-scoped object key. Return a short-lived presigned PUT URL and required headers.
5. Browser uploads directly to R2. Then call a server-side confirmation use case that checks ownership and validates object existence, content type and size using HeadObject before inserting the `book_documents` record. Prevent overwriting an existing document or confirming an arbitrary key. Consider a pending-upload record or server-signed upload intent to bind the key to the authenticated user and book.
6. For reads, authorize book ownership and return short-lived presigned GET URLs; support PDF range reads as needed. Never expose permanent public object URLs.
7. Add unit/integration tests for unauthorized access, cross-user keys, wrong MIME types, oversized files, replayed confirmations, expired intents and missing objects.
8. Run `pnpm verify`, deploy to a preview environment, test with a small PDF and EPUB, then merge only after review.

## Operational note

R2 S3 API credentials are not created yet. Create a bucket-scoped token with only the necessary object permissions and configure it in Vercel's server-side environment. Never commit credentials. Update R2 CORS with the future ReadOn domain before DNS migration.
