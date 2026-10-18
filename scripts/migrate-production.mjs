import { spawnSync } from "node:child_process";

if (process.env.CONFIRM_PRODUCTION_MIGRATION !== "READ_BUDDY_PRODUCTION") {
  console.error(`
Production migration blocked.

Set:

CONFIRM_PRODUCTION_MIGRATION=READ_BUDDY_PRODUCTION

before running this command.
`);

  process.exit(1);
}

console.log("Requesting the approval-gated production migration workflow...");

const result = spawnSync(
  "gh",
  [
    "workflow",
    "run",
    "deploy.yml",
    "--ref",
    "main",
    "--field",
    "mode=migrations-only",
  ],
  {
    stdio: "inherit",
    env: process.env,
  },
);

if (result.error?.code === "ENOENT") {
  console.error("ERROR: GitHub CLI (gh) is required.");
  process.exit(1);
}

process.exit(result.status ?? 1);
