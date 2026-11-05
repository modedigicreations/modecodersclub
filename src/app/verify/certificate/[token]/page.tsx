import type { Metadata } from "next";
import Link from "next/link";
import { verifyCertificateVerificationToken } from "@/lib/certificate-verification";
import prisma from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Certificate verification",
  robots: { index: false, follow: false },
};

// Reads a request-specific token, so this is never prerenderable — and
// shouldn't be, since the whole point is checking live certificate status.
export const instant = false;

type PageProps = { params: Promise<{ token: string }> };

export default async function CertificateVerificationPage({ params }: PageProps) {
  const { token } = await params;
  const certificateId = verifyCertificateVerificationToken(token);
  const certificate = certificateId
    ? await prisma.certificate.findUnique({
        where: { id: certificateId },
        select: { certificateNumber: true, recipientName: true, courseName: true, status: true, issuedAt: true },
      })
    : null;
  const verified = certificate?.status === "ACTIVE";

  return (
    <main className="auth-page">
      <section className={`auth-card ${verified ? "" : "auth-card-invalid"}`} style={{ maxWidth: 460 }}>
        <Link className="brand" href="/" aria-label="Mode Coders Club home" style={{ marginBottom: 20 }}>
          <span className="brand-mark" aria-hidden="true">&lt;/&gt;</span>
          <span className="brand-name">MODE<span>CODERS CLUB</span></span>
        </Link>
        <p className="eyebrow" style={{ color: verified ? "var(--green-dark)" : "#b1467a" }}>
          <span /> Certificate status
        </p>
        <h1>{verified ? "Certificate verified" : "Certificate not verified"}</h1>
        {verified && certificate ? (
          <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
            <div>
              <p className="auth-subtitle" style={{ marginBottom: 2 }}>Recipient</p>
              <p style={{ fontWeight: 700 }}>{certificate.recipientName}</p>
            </div>
            <div>
              <p className="auth-subtitle" style={{ marginBottom: 2 }}>Course</p>
              <p style={{ fontWeight: 700 }}>{certificate.courseName}</p>
            </div>
            <div>
              <p className="auth-subtitle" style={{ marginBottom: 2 }}>Certificate number</p>
              <p style={{ fontWeight: 700 }}>{certificate.certificateNumber}</p>
            </div>
            <div>
              <p className="auth-subtitle" style={{ marginBottom: 2 }}>Issue date</p>
              <p style={{ fontWeight: 700 }}>
                {new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(certificate.issuedAt)}
              </p>
            </div>
          </div>
        ) : (
          <p className="auth-subtitle" style={{ marginTop: 10 }}>
            This certificate link is invalid, the certificate was not found, or the award is no longer active.
          </p>
        )}
      </section>
    </main>
  );
}
