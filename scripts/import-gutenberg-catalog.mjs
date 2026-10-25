#!/usr/bin/env node
// Offline, bounded Gutenberg importer. Dry-run by default.
import { Pool } from "pg";

const MAX_CSV = 60 * 1024 * 1024;
const limit = Number(process.env.GUTENBERG_IMPORT_LIMIT || "25");
const apply = process.argv.includes("--apply");
if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
  throw Error("GUTENBERG_IMPORT_LIMIT must be 1–200");
}

function* csvRows(text) {
  let row = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field.replace(/\r$/, ""));
      yield row;
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw Error("Unterminated quoted CSV field");
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    yield row;
  }
}

async function fetchCatalog() {
  const response = await fetch(
    "https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv",
    { signal: AbortSignal.timeout(90_000) },
  );
  if (!response.ok || !response.body) throw Error("Catalog download failed");
  const pieces = [];
  let bytes = 0;
  for await (const piece of response.body) {
    bytes += piece.byteLength;
    if (bytes > MAX_CSV) throw Error("Catalog exceeds 60 MB safety limit");
    pieces.push(piece);
  }
  return Buffer.concat(pieces, bytes)
    .toString("utf8")
    .replace(/^\uFEFF/, "");
}

function booksFromCsv(text) {
  const rows = csvRows(text);
  const header = rows.next().value || [];
  const ix = Object.fromEntries(
    header.map((key, index) => [key.trim(), index]),
  );
  if (
    ["Text#", "Type", "Title", "Language", "Authors"].some(
      (key) => ix[key] === undefined,
    )
  )
    throw Error("Unexpected Gutenberg catalog CSV columns");
  const books = [];
  for (const row of rows) {
    const id = Number(row[ix["Text#"]]);
    const title = row[ix.Title]?.trim();
    const author = row[ix.Authors]?.trim() || "Unknown author";
    const langs = (row[ix.Language] || "").split(";").map((x) => x.trim());
    if (
      Number.isSafeInteger(id) &&
      id > 0 &&
      title &&
      row[ix.Type]?.trim() === "Text" &&
      langs.includes("en")
    ) {
      books.push({ id, title, author, language: "en" });
    }
  }
  return books.sort((a, b) => a.id - b.id);
}

async function epubAvailable(id) {
  // No third-party or user-controlled hostnames; bounded, read-only probes.
  const url = "https://www.gutenberg.org/ebooks/" + id + ".epub3.images";
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
      headers: { Range: "bytes=0-3" },
    });
    if (res.status !== 200 && res.status !== 206) return null;
    if (new URL(res.url).hostname !== "www.gutenberg.org") return null;
    const reader = res.body?.getReader();
    if (!reader) return null;
    const part = await reader.read();
    await reader.cancel();
    if (part.value?.[0] !== 0x50 || part.value?.[1] !== 0x4b) return null;
    return url;
  } catch {
    return null;
  }
}

async function main() {
  const candidates = booksFromCsv(await fetchCatalog());
  const verified = [];
  for (const book of candidates.slice(0, limit * 8)) {
    const epubUrl = await epubAvailable(book.id);
    if (epubUrl) verified.push({ ...book, epubUrl });
    if (verified.length >= limit) break;
  }
  console.log("Verified downloadable EPUBs:", verified.length);
  if (!verified.length) throw Error("No valid EPUBs; database unchanged");
  if (!apply) {
    console.log(
      "DRY RUN: no database changes. Pass --apply to persist verified records.",
    );
    return;
  }
  if (!process.env.DATABASE_URL)
    throw Error("DATABASE_URL required for --apply");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const book of verified) {
        await client.query(
          "INSERT INTO gutenberg_catalog (id,title,author,language,epub_url) " +
            "VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET " +
            "title=EXCLUDED.title,author=EXCLUDED.author,language=EXCLUDED.language," +
            "epub_url=EXCLUDED.epub_url,imported_at=now()",
          [book.id, book.title, book.author, book.language, book.epubUrl],
        );
      }
      await client.query("COMMIT");
      console.log("Imported verified EPUB records:", verified.length);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message || "Catalog import failed");
  process.exitCode = 1;
});
