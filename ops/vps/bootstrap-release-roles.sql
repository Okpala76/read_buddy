\set ON_ERROR_STOP on

DO $block$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'read_buddy_backup') THEN
    CREATE ROLE read_buddy_backup
      LOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  END IF;
END
$block$;

ALTER ROLE read_buddy_backup
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS;
GRANT CONNECT ON DATABASE read_buddy TO read_buddy_backup;
GRANT USAGE ON SCHEMA public, drizzle TO read_buddy_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public, drizzle TO read_buddy_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public, drizzle TO read_buddy_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE read_buddy_admin IN SCHEMA public
  GRANT SELECT ON TABLES TO read_buddy_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE read_buddy_admin IN SCHEMA public
  GRANT SELECT ON SEQUENCES TO read_buddy_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE read_buddy_admin IN SCHEMA drizzle
  GRANT SELECT ON TABLES TO read_buddy_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE read_buddy_admin IN SCHEMA drizzle
  GRANT SELECT ON SEQUENCES TO read_buddy_backup;

GRANT CONNECT ON DATABASE read_buddy TO read_buddy_app;
GRANT USAGE ON SCHEMA public TO read_buddy_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO read_buddy_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO read_buddy_app;
ALTER DEFAULT PRIVILEGES FOR ROLE read_buddy_admin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO read_buddy_app;
ALTER DEFAULT PRIVILEGES FOR ROLE read_buddy_admin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO read_buddy_app;

-- The existing owner retains the DDL privileges needed for migrations but no
-- longer has cluster-wide superuser or role/database administration powers.
ALTER ROLE read_buddy_admin
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS;
