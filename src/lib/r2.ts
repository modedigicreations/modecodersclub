import { randomBytes } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Cloudflare R2 (S3-compatible) for uploaded images. Same variable names as
// modecbt: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
// R2_BUCKET_NAME, R2_PUBLIC_URL (the bucket's public r2.dev or custom domain).
// R2_ENDPOINT overrides the endpoint (local testing only).

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export function r2Configured() {
  return Boolean(
    (process.env.R2_ACCOUNT_ID || process.env.R2_ENDPOINT) &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_URL,
  );
}

let client: S3Client | null = null;
function r2() {
  client ??= new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: Boolean(process.env.R2_ENDPOINT),
    // Cloudflare's guidance for AWS SDK v3.729+: only send checksums when an
    // operation requires them (R2 rejects some of the newer default headers).
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });
  return client;
}

const SIGNATURES: { type: string; ext: string; test: (b: Uint8Array) => boolean }[] = [
  { type: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", ext: "png", test: (b) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v) },
  { type: "image/gif", ext: "gif", test: (b) => String.fromCharCode(...b.slice(0, 6)) === "GIF87a" || String.fromCharCode(...b.slice(0, 6)) === "GIF89a" },
  { type: "image/webp", ext: "webp", test: (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP" },
];

/** The image type from the file's first bytes (not its name or claimed type). SVG is never accepted. */
export function sniffImage(bytes: Uint8Array): { type: string; ext: string } | null {
  const hit = SIGNATURES.find((s) => bytes.length >= 12 && s.test(bytes));
  return hit ? { type: hit.type, ext: hit.ext } : null;
}

/** Stores an image under <folder>/YYYY/MM/<random>.<ext> and returns its public URL. */
export async function uploadImage(bytes: Uint8Array, folder: string): Promise<string> {
  const kind = sniffImage(bytes);
  if (!kind) throw new Error("not an image");
  const now = new Date();
  const key = `${folder}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomBytes(12).toString("hex")}.${kind.ext}`;
  await r2().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: bytes,
      ContentType: kind.type,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `${process.env.R2_PUBLIC_URL!.replace(/\/+$/, "")}/${key}`;
}

/**
 * Why R2 refused an upload, in words an admin can act on (no secrets included).
 * Shown only to admins, so they can fix the Railway settings.
 */
export function explainR2Error(error: unknown): string {
  const e = error as { name?: string; Code?: string; code?: string; message?: string; $metadata?: { httpStatusCode?: number } };
  const name = e?.name || e?.Code || e?.code || "";
  const status = e?.$metadata?.httpStatusCode;
  switch (name) {
    case "InvalidAccessKeyId":
      return "R2 doesn't recognise R2_ACCESS_KEY_ID. Use the Access Key ID from R2 → Manage API tokens (not a Cloudflare API token).";
    case "SignatureDoesNotMatch":
      return "R2_SECRET_ACCESS_KEY doesn't match R2_ACCESS_KEY_ID. Copy the Secret Access Key shown when the R2 token was created.";
    case "NoSuchBucket":
      return `R2 has no bucket called "${process.env.R2_BUCKET_NAME}". Check R2_BUCKET_NAME (it's case-sensitive).`;
    case "AccessDenied":
    case "Forbidden":
      return "R2 refused access. Give the R2 API token Object Read & Write permission for this bucket.";
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return "Couldn't reach R2. Check R2_ACCOUNT_ID (the 32-character account ID from the R2 overview page).";
  }
  if (status === 401 || status === 403) return "R2 refused the credentials. Check R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and the token's bucket permissions.";
  if (status === 404) return `R2 couldn't find the bucket "${process.env.R2_BUCKET_NAME}". Check R2_BUCKET_NAME and R2_ACCOUNT_ID.`;
  return `R2 refused the upload (${name || status || "unknown error"}). Check the R2 settings on the server.`;
}
