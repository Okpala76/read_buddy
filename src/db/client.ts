import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/config/env";
import * as schema from "@/db/schema";

const isBuildTime = env.DATABASE_URL?.includes("dummy") === true;

function createPool() {
  if (isBuildTime) {
    return null;
  }

  const connectionUrl = new URL(env.DATABASE_URL);
  // Preserve pg 8's strict behavior without its deprecated sslmode=require alias.
  if (connectionUrl.searchParams.get("sslmode") === "require") {
    connectionUrl.searchParams.set("sslmode", "verify-full");
  }

  console.info("Database pool configured", {
    host: connectionUrl.hostname,
    port: connectionUrl.port || "5432",
    database: connectionUrl.pathname.slice(1),
    user: decodeURIComponent(connectionUrl.username),
    sslMode: connectionUrl.searchParams.get("sslmode") ?? env.DATABASE_SSL,
    poolMax: env.DATABASE_POOL_MAX,
  });

  const ssl =
    env.DATABASE_SSL === "disable"
      ? false
      : {
          rejectUnauthorized: env.DATABASE_SSL === "verify-full",
          ...(env.DATABASE_CA_CERT
            ? { ca: env.DATABASE_CA_CERT.replaceAll("\\n", "\n") }
            : {}),
        };

  return new Pool({
    connectionString: connectionUrl.toString(),
    max: env.DATABASE_POOL_MAX,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    ssl,
  });
}

const globalForDatabase = globalThis as unknown as {
  databasePool?: Pool | null;
};

export const databasePool = globalForDatabase.databasePool ?? createPool();

if (env.NODE_ENV !== "production" && !isBuildTime) {
  globalForDatabase.databasePool = databasePool;
}

export const db = databasePool ? drizzle(databasePool, { schema }) : undefined;
