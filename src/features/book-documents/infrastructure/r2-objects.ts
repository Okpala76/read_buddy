import "server-only";

import { createHmac, createHash } from "node:crypto";

import { getR2Config } from "./r2-config";

type Method = "GET" | "PUT" | "HEAD";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function encodePath(value: string) {
  return value.split("/").map(encodeURIComponent).join("/");
}

/**
 * Sign S3-compatible requests using AWS Signature V4.
 * R2 uses the auto region and the s3 signing service.
 */
function signedRequest(args: {
  method: Method;
  key: string;
  expiresSeconds?: number;
  contentType?: string;
}) {
  const config = getR2Config();
  const now = new Date();
  const date = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const day = date.slice(0, 8);
  const region = "auto";
  const scope = `${day}/${region}/s3/aws4_request`;
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const path = `/${encodeURIComponent(config.bucketName)}/${encodePath(args.key)}`;
  const headers: Record<string, string> = { host };
  if (args.contentType) headers["content-type"] = args.contentType;
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.entries(headers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}:${value.trim()}\n`)
    .join("");

  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${scope}`,
    "X-Amz-Date": date,
    "X-Amz-Expires": String(args.expiresSeconds ?? 300),
    "X-Amz-SignedHeaders": signedHeaders,
  });
  params.sort();
  const canonicalRequest = [
    args.method,
    path,
    params.toString(),
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    date,
    scope,
    sha256(canonicalRequest),
  ].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${config.secretAccessKey}`, day), region), "s3"),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");
  params.set("X-Amz-Signature", signature);

  return {
    url: `https://${host}${path}?${params.toString()}`,
    headers: args.contentType ? { "Content-Type": args.contentType } : {},
  };
}

export function createUploadUrl(key: string, contentType: string) {
  return signedRequest({
    method: "PUT",
    key,
    contentType,
    expiresSeconds: 300,
  });
}

export function createDownloadUrl(key: string) {
  return signedRequest({ method: "GET", key, expiresSeconds: 300 }).url;
}

export async function headDocument(key: string) {
  const request = signedRequest({ method: "HEAD", key, expiresSeconds: 60 });
  const response = await fetch(request.url, {
    method: "HEAD",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Uploaded document could not be verified in storage");
  }
  return {
    sizeBytes: Number(response.headers.get("content-length")),
    contentType: response.headers.get("content-type")?.split(";")[0] ?? "",
  };
}
