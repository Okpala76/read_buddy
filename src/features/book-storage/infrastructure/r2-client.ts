import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const URL_TTL_SECONDS = 300;

function getR2Settings() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET_NAME;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare R2 storage is not configured");
  }

  return { accountId, bucket, accessKeyId, secretAccessKey };
}

function getClient() {
  const settings = getR2Settings();
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${settings.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey,
    },
    forcePathStyle: true,
  });
  return { client, bucket: settings.bucket };
}

/** Generates a short-lived direct browser PUT. Never return storage credentials. */
export async function signPdfUpload(key: string) {
  const { client, bucket } = getClient();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: "application/pdf",
    }),
    { expiresIn: URL_TTL_SECONDS },
  );
}

/** Never issue download links without a caller having verified document ownership. */
export async function signPdfDownload(key: string) {
  const { client, bucket } = getClient();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: URL_TTL_SECONDS },
  );
}

export async function inspectPdfUpload(key: string) {
  const { client, bucket } = getClient();
  const response = await client.send(
    new HeadObjectCommand({ Bucket: bucket, Key: key }),
  );
  return {
    sizeBytes: response.ContentLength ?? 0,
    contentType: response.ContentType ?? "",
  };
}

export async function readPdfSignature(key: string) {
  const { client, bucket } = getClient();
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key, Range: "bytes=0-4" }),
  );
  const bytes = await response.Body?.transformToByteArray();
  return bytes ?? new Uint8Array();
}

export async function deletePdfObject(key: string) {
  const { client, bucket } = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
