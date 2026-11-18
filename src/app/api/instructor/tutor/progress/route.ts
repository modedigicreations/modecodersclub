import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getTutorClassReport, tutorReportCsv } from "@/lib/tutor/class-report";

/** CSV of tutor progress for instructors and admins (?school= to filter). */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  if (session.user.role !== "admin" && session.user.role !== "instructor") {
    return NextResponse.json({ error: "Instructors only." }, { status: 403 });
  }
  const school = new URL(request.url).searchParams.get("school") ?? undefined;
  const rows = await getTutorClassReport({ school: school || undefined });
  return new NextResponse("﻿" + tutorReportCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tutor-progress${school ? "-" + school.replace(/[^a-z0-9]+/gi, "-").toLowerCase() : ""}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
