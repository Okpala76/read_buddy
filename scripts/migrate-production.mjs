import { spawnSync } from "node:child_process";

const productionUrl = process.env.PRODUCTION_DATABASE_URL;

if (!productionUrl) {
  console.error("ERROR: PRODUCTION_DATABASE_URL is not set.");
  process.exit(1);
}

if (process.env.CONFIRM_PRODUCTION_MIGRATION !== "READ_BUDDY_PRODUCTION") {
  console.error(`
Production migration blocked.

Set:

CONFIRM_PRODUCTION_MIGRATION=READ_BUDDY_PRODUCTION

before running this command.
`);

  process.exit(1);
}

console.log("Running Reading Buddy PRODUCTION database migrations...");

const result = spawnSync(
  "pnpm",
  ["exec", "drizzle-kit", "migrate", "--config=drizzle.prod.config.ts"],
  {
    stdio: "inherit",
    shell: true,
    env: process.env,
  },
);

process.exit(result.status ?? 1);
