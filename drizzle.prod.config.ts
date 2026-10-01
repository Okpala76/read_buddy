import { defineConfig } from "drizzle-kit";
import { z } from "zod";

const productionDatabaseUrl = z
  .string()
  .min(1, "PRODUCTION_DATABASE_URL is required")
  .parse(process.env.PRODUCTION_DATABASE_URL);

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: productionDatabaseUrl,
  },
  strict: true,
  verbose: true,
});
