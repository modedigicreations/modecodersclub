import { createHmac, timingSafeEqual } from "node:crypto";

function verificationSignature(certificateId: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`modecodersclub-certificate:${certificateId}`)
    .digest("base64url");
}

function certificateSigningSecret() {
  const secret = process.env.CERTIFICATE_SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("CERTIFICATE_SIGNING_SECRET must be set to a value of at least 32 characters.");
  }
  return secret;
}

export function assertCertificateSigningConfigured() {
  certificateSigningSecret();
}

export function createCertificateVerificationToken(certificateId: string) {
  return `${certificateId}.${verificationSignature(certificateId, certificateSigningSecret())}`;
}

export function verifyCertificateVerificationToken(token: string) {
  const separator = token.indexOf(".");
  if (separator < 1 || separator !== token.lastIndexOf(".")) return null;

  const certificateId = token.slice(0, separator);
  const secret = certificateSigningSecret();
  const supplied = Buffer.from(token.slice(separator + 1));
  const expected = Buffer.from(verificationSignature(certificateId, secret));
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  return certificateId;
}
