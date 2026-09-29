# PgBouncer TLS certificates

For production, mount a host directory here or set `PGBOUNCER_CERT_DIR` to a directory containing `server.crt` and `server.key`. Keep private keys and issued certificates outside Git. PgBouncer accepts Vercel client connections only over TLS; its PostgreSQL connection stays on the private Docker network.
