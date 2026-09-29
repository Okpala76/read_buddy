import "dotenv/config";

import { defineConfig } from "drizzle-kit";
import { z } from "zod";

const databaseUrl = z.string().url().parse(process.env.DATABASE_URL);

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
