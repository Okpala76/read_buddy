import { createHmac } from "node:crypto";
import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const [releaseSha, bundlePath, signaturePath] = process.argv.slice(2);
const key = process.env.MIGRATION_BUNDLE_HMAC_KEY;

if (
  !/^[0-9a-f]{40}$/.test(releaseSha ?? "") ||
  !bundlePath ||
  !signaturePath ||
  !key ||
  Buffer.byteLength(key) < 32
) {
  throw new Error(
    "A release SHA, bundle, signature path, and 32-byte HMAC key are required",
  );
}

const hmac = createHmac("sha256", key);
hmac.update(`${releaseSha}\n`);

for await (const chunk of createReadStream(path.resolve(bundlePath))) {
  hmac.update(chunk);
}

await writeFile(path.resolve(signaturePath), `${hmac.digest("hex")}\n`, {
  mode: 0o600,
});

console.log("Signed the commit-addressed migration bundle.");
