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
  // DATABASE_SSL is authoritative; pg otherwise lets sslmode override this object.
  connectionUrl.searchParams.delete("sslmode");

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
