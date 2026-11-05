import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { NextResponse } from "next/server";
import {
  assertCertificateSigningConfigured,
  createCertificateVerificationToken,
} from "@/lib/certificate-verification";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

function pdfText(value: string) {
  return value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").replace(/[^\x20-\x7E]/g, "?");
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin sign-in is required." }, { status: 401 });
  }

  const { id } = await params;
  const certificate = await prisma.certificate.findUnique({ where: { id } });
  if (!certificate) {
    return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
  }

  const baseUrl = process.env.BETTER_AUTH_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "The public application URL must be configured." }, { status: 503 });
  }
  try {
    assertCertificateSigningConfigured();
  } catch {
    return NextResponse.json({ error: "The certificate signing secret is not configured correctly." }, { status: 503 });
  }

  const token = createCertificateVerificationToken(certificate.id);
  let verificationUrl: string;
  try {
    verificationUrl = new URL(`/verify/certificate/${token}`, baseUrl).toString();
  } catch {
    return NextResponse.json({ error: "The public application URL is invalid." }, { status: 503 });
  }
  const qrBytes = await QRCode.toBuffer(verificationUrl, {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 1,
    width: 240,
  });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const qr = await pdf.embedPng(qrBytes);
  const ink = rgb(0.125, 0.149, 0.188); // --ink
  const accent = rgb(0.055, 0.608, 0.443); // --green-dark

  page.drawRectangle({ x: 24, y: 24, width: 794, height: 547, borderWidth: 2, borderColor: accent });
  page.drawText("MODE CODERS CLUB", { x: 48, y: 525, size: 10, font: bold, color: accent });
  page.drawText("CERTIFICATE OF COMPLETION", { x: 48, y: 475, size: 24, font: bold, color: ink });
  page.drawText("This certifies that", { x: 48, y: 424, size: 13, font: regular, color: ink });
  page.drawText(pdfText(certificate.recipientName).slice(0, 100), { x: 48, y: 382, size: 23, font: bold, color: ink });
  page.drawText("has successfully completed", { x: 48, y: 345, size: 12, font: regular, color: ink });
  page.drawText(pdfText(certificate.courseName).slice(0, 90), { x: 48, y: 320, size: 14, font: bold, color: ink });
  page.drawText(`Certificate number: ${certificate.certificateNumber}`, { x: 48, y: 282, size: 10, font: regular, color: ink });
  page.drawText(
    `Issued: ${new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(certificate.issuedAt)}`,
    { x: 48, y: 261, size: 10, font: regular, color: ink },
  );
  page.drawImage(qr, { x: 636, y: 128, width: 142, height: 142 });
  page.drawText("Scan to verify", { x: 664, y: 110, size: 9, font: regular, color: ink });
  page.drawText("Mode Coders Club", { x: 48, y: 151, size: 12, font: bold, color: ink });
  page.drawLine({ start: { x: 48, y: 174 }, end: { x: 260, y: 174 }, thickness: 1, color: accent });

  const bytes = await pdf.save();
  const body = new Uint8Array(bytes.byteLength);
  body.set(bytes);
  const safeNumber = certificate.certificateNumber.replace(/[^A-Za-z0-9_-]/g, "_");
  return new Response(body.buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificate-${safeNumber}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
