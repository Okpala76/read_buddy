import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const migrationsDirectory = path.resolve("src/db/migrations");
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((file) => /^\d{4}_.+\.sql$/.test(file))
  .sort();

const client = new Client({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === "disable" ? false : undefined,
});

await client.connect();

try {
  for (const file of migrationFiles) {
    const sql = await readFile(path.join(migrationsDirectory, file), "utf8");
    console.log(`Applying ${file}`);
    await client.query(sql);
  }
} finally {
  await client.end();
}
