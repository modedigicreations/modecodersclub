import prisma from "@/lib/prisma";
import { csvCell } from "@/lib/learner-progress";
import { trackSkills } from "./skills";
import type { Track } from "./types";

/**
 * Who may see learners' tutor progress (names, emails, schools): admins, and
 * instructors an admin has assigned to at least one course. Anyone can sign
 * up as an instructor, so the role alone isn't enough.
 */
export async function canViewTutorReport(user: { id: string; role?: string | null }): Promise<boolean> {
  if (user.role === "admin") return true;
  if (user.role !== "instructor") return false;
  return (await prisma.courseInstructor.count({ where: { userId: user.id } })) > 0;
}

export type TutorLearnerRow = {
  userId: string;
  name: string;
  email: string;
  school: string | null;
  reading: { stage: number; mastered: number; total: number; current: string | null };
  maths: { stage: number; mastered: number; total: number; current: string | null };
  /** Skills practised 5+ times with under 60% right and not yet mastered. */
  needsHelp: string[];
  writingAverage: number | null;
  lastPractised: Date | null;
};

function trackSummary(track: Track, rows: { skillId: string; masteredAt: Date | null }[]) {
  const ladder = trackSkills(track);
  const mastered = new Set(rows.filter((r) => r.masteredAt).map((r) => r.skillId));
  const current = ladder.find((s) => !mastered.has(s.id)) ?? null;
  return {
    stage: current?.level ?? ladder.at(-1)!.level,
    mastered: ladder.filter((s) => mastered.has(s.id)).length,
    total: ladder.length,
    current: current?.title ?? null,
  };
}

/** Everyone who has used the tutor (optionally one school), for teachers and admins. */
export async function getTutorClassReport(filter: { school?: string; search?: string } = {}): Promise<TutorLearnerRow[]> {
  const users = await prisma.user.findMany({
    where: {
      role: "learner",
      tutorProgress: { some: {} },
      ...(filter.school ? { schoolName: filter.school } : {}),
      ...(filter.search
        ? { OR: [{ name: { contains: filter.search, mode: "insensitive" } }, { email: { contains: filter.search, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 2000,
    select: { id: true, name: true, email: true, schoolName: true },
  });
  const ids = users.map((u) => u.id);
  const [progress, writing] = await Promise.all([
    prisma.tutorSkillProgress.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, skillId: true, track: true, attempts: true, correct: true, masteredAt: true, lastPracticedAt: true },
    }),
    prisma.tutorWriting.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _avg: { score: true } }),
  ]);
  const titles = new Map([...trackSkills("literacy"), ...trackSkills("numeracy")].map((s) => [s.id, s.title]));
  const byUser = new Map<string, typeof progress>();
  for (const p of progress) {
    if (!byUser.has(p.userId)) byUser.set(p.userId, []);
    byUser.get(p.userId)!.push(p);
  }
  const writingAvg = new Map(writing.map((w) => [w.userId, w._avg.score]));
  return users.map((u) => {
    const rows = byUser.get(u.id) ?? [];
    const last = rows.reduce<Date | null>((m, r) => (r.lastPracticedAt && (!m || r.lastPracticedAt > m) ? r.lastPracticedAt : m), null);
    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      school: u.schoolName,
      reading: trackSummary("literacy", rows.filter((r) => r.track === "literacy")),
      maths: trackSummary("numeracy", rows.filter((r) => r.track === "numeracy")),
      needsHelp: rows
        .filter((r) => !r.masteredAt && r.attempts >= 5 && r.correct / r.attempts < 0.6)
        .map((r) => titles.get(r.skillId) ?? r.skillId),
      writingAverage: writingAvg.get(u.id) == null ? null : Math.round(writingAvg.get(u.id)!),
      lastPractised: last,
    };
  });
}

export async function tutorSchools(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { schoolName: { not: null }, tutorProgress: { some: {} } },
    distinct: ["schoolName"],
    select: { schoolName: true },
    orderBy: { schoolName: "asc" },
  });
  return rows.map((r) => r.schoolName!).filter(Boolean);
}

export function tutorReportCsv(rows: TutorLearnerRow[]): string {
  const header = [
    "Name", "Email", "School", "Reading stage", "Reading skills mastered", "Reading working on",
    "Maths stage", "Maths skills mastered", "Maths working on", "Needs help with", "Writing average %", "Last practised",
  ];
  const lines = rows.map((r) =>
    [
      r.name, r.email, r.school ?? "", r.reading.stage, `${r.reading.mastered}/${r.reading.total}`, r.reading.current ?? "All mastered",
      r.maths.stage, `${r.maths.mastered}/${r.maths.total}`, r.maths.current ?? "All mastered", r.needsHelp.join("; "),
      r.writingAverage ?? "", r.lastPractised ?? "",
    ].map(csvCell).join(","),
  );
  return [header.map(csvCell).join(","), ...lines].join("\r\n") + "\r\n";
}
