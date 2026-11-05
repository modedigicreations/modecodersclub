"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { assertCertificateSigningConfigured } from "@/lib/certificate-verification";
import prisma from "@/lib/prisma";

function isRedirectError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}

export async function issueCertificate(formData: FormData) {
  const session = await requireAdmin();

  try {
    const recipientName = String(formData.get("recipientName") ?? "").trim();
    const courseName = String(formData.get("courseName") ?? "").trim();
    if (!recipientName || recipientName.length > 120) {
      throw new Error("Enter a recipient name (up to 120 characters).");
    }
    if (!courseName || courseName.length > 120) {
      throw new Error("Choose a course name (up to 120 characters).");
    }
    assertCertificateSigningConfigured();

    const certificateNumber = `MCC-${new Date().getUTCFullYear()}-${randomBytes(6).toString("hex").toUpperCase()}`;
    await prisma.certificate.create({
      data: {
        certificateNumber,
        recipientName,
        courseName,
        issuedById: session.user.id,
      },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Could not issue the certificate.";
    redirect(`/admin/certificates?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/certificates");
  redirect("/admin/certificates");
}

export async function revokeCertificate(id: string, formData: FormData) {
  const session = await requireAdmin();
  const reason = String(formData.get("reason") ?? "").trim();

  try {
    if (reason.length < 2 || reason.length > 1000) {
      throw new Error("Enter a revocation reason between 2 and 1,000 characters.");
    }
    const certificate = await prisma.certificate.findUnique({ where: { id } });
    if (!certificate) throw new Error("Certificate not found.");
    if (certificate.status === "REVOKED") throw new Error("This certificate has already been revoked.");

    await prisma.certificate.update({
      where: { id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedById: session.user.id,
        revocationReason: reason,
      },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Could not revoke the certificate.";
    redirect(`/admin/certificates?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/certificates");
  redirect("/admin/certificates");
}
