import { createCertificateVerificationToken } from "@/lib/certificate-verification";
import prisma from "@/lib/prisma";
import { issueCertificate, revokeCertificate } from "./actions";

export default async function AdminCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [certificates, courses] = await Promise.all([
    prisma.certificate.findMany({ orderBy: { issuedAt: "desc" } }),
    prisma.course.findMany({ where: { archivedAt: null }, orderBy: { order: "asc" } }),
  ]);
  const baseUrl = process.env.BETTER_AUTH_URL ?? "";

  function verifyUrl(certificateId: string): string | null {
    if (!baseUrl) return null;
    try {
      return `${baseUrl}/verify/certificate/${createCertificateVerificationToken(certificateId)}`;
    } catch {
      return null;
    }
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Certificates</h1>
      </div>

      {error && <p className="auth-error">{error}</p>}

      <form className="admin-form" action={issueCertificate}>
        <div className="admin-form-row">
          <div>
            <label htmlFor="recipientName">Recipient name</label>
            <input id="recipientName" name="recipientName" required />
          </div>
          <div>
            <label htmlFor="courseName">Course</label>
            <select id="courseName" name="courseName" required defaultValue="">
              <option value="" disabled>
                Choose a course
              </option>
              {courses.map((course) => (
                <option key={course.id} value={course.name}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="button button-primary" type="submit" style={{ justifySelf: "start" }}>
          Issue certificate
        </button>
      </form>

      {certificates.length === 0 ? (
        <p className="admin-empty">No certificates issued yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Course</th>
              <th>Number</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {certificates.map((certificate) => (
              <tr key={certificate.id}>
                <td>{certificate.recipientName}</td>
                <td>{certificate.courseName}</td>
                <td style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11 }}>
                  {certificate.certificateNumber}
                </td>
                <td>
                  {certificate.status === "ACTIVE" ? "Active" : `Revoked: ${certificate.revocationReason}`}
                </td>
                <td>
                  <div className="admin-actions">
                    <a href={`/api/certificates/${certificate.id}/pdf`}>Download PDF</a>
                    {verifyUrl(certificate.id) && (
                      <a href={verifyUrl(certificate.id)!} target="_blank" rel="noopener noreferrer">
                        Verify link
                      </a>
                    )}
                    {certificate.status === "ACTIVE" && (
                      <form action={revokeCertificate.bind(null, certificate.id)} style={{ display: "flex", gap: 6 }}>
                        <input
                          name="reason"
                          placeholder="Revocation reason"
                          required
                          style={{
                            padding: "6px 8px",
                            border: "1px solid var(--line)",
                            borderRadius: 6,
                            fontSize: 11,
                            width: 150,
                          }}
                        />
                        <button type="submit" className="danger">
                          Revoke
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
