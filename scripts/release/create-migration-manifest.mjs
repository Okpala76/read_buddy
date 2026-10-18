import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const outputPath = process.argv[2];

if (!outputPath) {
  throw new Error("Usage: node create-migration-manifest.mjs <output-path>");
}

const migrationsDirectory = path.resolve("src/db/migrations");
const journal = JSON.parse(
  await readFile(path.join(migrationsDirectory, "meta/_journal.json"), "utf8"),
);

if (journal.dialect !== "postgresql" || !Array.isArray(journal.entries)) {
  throw new Error("Invalid PostgreSQL migration journal");
}

let previousTimestamp = -1;
const tags = new Set();
const lines = [];

for (const [position, entry] of journal.entries.entries()) {
  if (entry.idx !== position) {
    throw new Error(`Migration index ${entry.idx} is out of sequence`);
  }
  if (!Number.isSafeInteger(entry.when) || entry.when <= previousTimestamp) {
    throw new Error(`Migration ${entry.tag} has a non-increasing timestamp`);
  }
  if (!/^\d{4}_[a-z0-9_]+$/.test(entry.tag) || tags.has(entry.tag)) {
    throw new Error(`Migration tag is invalid or duplicated: ${entry.tag}`);
  }

  const sql = await readFile(
    path.join(migrationsDirectory, `${entry.tag}.sql`),
    "utf8",
  );
  const hash = createHash("sha256").update(sql).digest("hex");
  lines.push([entry.idx, entry.when, hash, entry.tag].join("\t"));
  previousTimestamp = entry.when;
  tags.add(entry.tag);
}

await writeFile(path.resolve(outputPath), `${lines.join("\n")}\n`, {
  mode: 0o600,
});

console.log(`Validated ${lines.length} committed PostgreSQL migrations.`);
