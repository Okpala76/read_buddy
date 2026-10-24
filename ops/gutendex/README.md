# Gutendex deployment boundary

ReadOn must use a private, HTTPS Gutendex endpoint set with the Vercel server-side
environment variable `GUTENDEX_API_BASE_URL`. Do not merge the API-origin change
until the endpoint is deployed and tested.

## Current production access limitation

The existing GitHub Actions production SSH identity is bound to
`ops/vps/deploy-ssh-command.sh` and **only** accepts signed migration
bundle commands. It cannot run Docker Compose or install packages.

Do not modify that key's forced command, remove SSH restrictions, or run a
Docker deployment using the database migration identity.

## One-time VPS setup required

A VPS administrator should:

1. Create a dedicated, unprivileged Gutendex deployment account, with access
   only to a dedicated Gutendex Compose project and its persistent data.
2. Configure a separate GitHub Actions SSH deploy key with a narrowly scoped
   forced command that allows only `gutendex-deploy` and `gutendex-status`.
   Store its private key and pinned host key in GitHub Production secrets.
3. Allocate disk/memory after checking the catalog import requirements against
   current VPS capacity. Keep Gutendex in its own container/network and
   never reuse the ReadOn/Postgres credentials or volumes.
4. Place an authenticated HTTPS reverse proxy in front of Gutendex. Do not
   publish the catalog service's database port or container port publicly.
5. Verify `/books/?search=pride&mime_type=application%2Fepub%2Bzip`
   returns book records with EPUB URLs and confirm a sample EPUB download.
6. Set `GUTENDEX_API_BASE_URL` as a server-side Vercel Production variable,
   then merge and deploy this branch.

## Acceptance criteria

- Existing VPS services and database volumes are untouched.
- ReadOn does not call the public gutendex.com endpoint.
- Book search works from the deployed Vercel runtime.
- The catalog response includes downloadable EPUB formats.
- If the private catalog is down, the user sees a readable error.
- EPUB ingestion and in-app reading are a separate feature; catalog search
  alone does not mean a book is readable in ReadOn.

## Deployment security

Do not put SSH private keys, tokens, or VPS secrets in this repository.
Keep the GitHub Actions workflow restricted to trusted `main` and reviewed
production environments. Never grant the existing migration-only identity
general-purpose shell or Docker privileges.
