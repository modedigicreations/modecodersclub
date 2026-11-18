import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canViewTutorReport, getTutorClassReport, tutorReportCsv } from "@/lib/tutor/class-report";

/** CSV of tutor progress for instructors and admins (?school= to filter). */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  if (!(await canViewTutorReport(session.user))) {
    return NextResponse.json({ error: "Only admins and assigned instructors can see tutor progress." }, { status: 403 });
  }
  const params = new URL(request.url).searchParams;
  const school = params.get("school") ?? undefined;
  const search = params.get("q")?.trim().slice(0, 80) || undefined;
  const rows = await getTutorClassReport({ school: school || undefined, search });
  return new NextResponse("﻿" + tutorReportCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tutor-progress${school ? "-" + school.replace(/[^a-z0-9]+/gi, "-").toLowerCase() : ""}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
