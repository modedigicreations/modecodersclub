// One-off WordPress -> Mode Coders Club migration. Reads the JSON exports in
// scripts/migration-data/ (phpMyAdmin exports, gitignored) and upserts users,
// lessons, and enrollments. Safe to re-run: every write is keyed by a stable
// natural identifier (email, a deterministic "wp-lesson-<id>" id, or the
// Enrollment courseId+userId unique constraint).
//
// Run via Railway's Deployments > Console tab (this machine can't reach the
// production Postgres network): npx tsx scripts/migrate-wordpress.ts
import * as fs from "node:fs";
import * as path from "node:path";
import prisma from "../src/lib/prisma";

const DATA_DIR = path.join(__dirname, "migration-data");
const VIDEO_BASE = "https://legacy-media.modecodersclub.com.ng/wp-content/uploads/";

// The 7 WordPress "courses" that actually have lesson content, mapped to
// this app's Course slugs. Microsoft Word/Excel are promoted from
// FreeResource to Course below, since the real WP data has 11 real video
// lessons each (and real completed enrollments) — Scratch Exam and
// Computational Thinking have neither, so they stay FreeResources.
const COURSE_SLUG_BY_WP_ID: Record<string, string> = {
  "2895": "full-stack-web-development",
  "2940": "cybersecurity",
  "3005": "data-science",
  "3070": "ui-ux-design",
  "3145": "java-programming",
  "3698": "microsoft-excel",
  "3701": "microsoft-word",
};

interface WpUserRow {
  wp_user_id: string;
  email: string;
  name: string;
  registered_at: string;
}
interface WpLessonRow {
  lesson_id: string;
  title: string;
  lesson_order: string;
  course_id: string;
  topic_order: string;
  video_id_raw: string | null;
}
interface WpVideoPathRow {
  attachment_id: string;
  relative_path: string;
}
interface WpEnrollmentRow {
  wp_user_id: string;
  course_id: string;
  enrolled_at: string;
}

type PhpMyAdminExport<T> = Array<{ type: string; data?: T[] }>;

function readRows<T>(filename: string): T[] {
  const raw = fs.readFileSync(path.join(DATA_DIR, filename), "utf8");
  const doc = JSON.parse(raw) as PhpMyAdminExport<T>;
  const entry = doc.find((d) => d.type === "table" || d.type === "raw");
  return entry?.data ?? [];
}

function extractVideoAttachmentId(raw: string | null): string | null {
  if (!raw) return null;
  const match = raw.match(/"(\d+)"$/);
  return match ? match[1] : null;
}

async function promoteMicrosoftOfficeCourses() {
  for (const slug of ["microsoft-word", "microsoft-excel"] as const) {
    await prisma.freeResource.deleteMany({ where: { slug } });
  }

  await prisma.course.upsert({
    where: { slug: "microsoft-word" },
    update: {},
    create: {
      slug: "microsoft-word",
      name: "Microsoft Word",
      category: "Digital Literacy",
      level: "Build real office skills",
      description:
        "Practical, exam-style practice for core Microsoft Word skills: formatting, documents, and everyday office tasks.",
      icon: "W",
      color: "blue",
      duration: "11 lessons, self-paced",
      price: "Free",
      audience: "Anyone who wants hands-on practice with everyday Microsoft Word tasks.",
      outcomes: [
        "Formatting documents cleanly and consistently",
        "Working with templates, styles, and page layout",
        "Everyday office tasks: tables, headers, mail merge basics",
        "Exam-style practice questions to check real understanding",
      ],
      isFree: true,
      order: 100,
    },
  });

  await prisma.course.upsert({
    where: { slug: "microsoft-excel" },
    update: {},
    create: {
      slug: "microsoft-excel",
      name: "Microsoft Excel",
      category: "Digital Literacy",
      level: "Build real office skills",
      description:
        "Practical, exam-style practice for core Microsoft Excel skills: spreadsheets, formulas, and everyday office tasks.",
      icon: "X",
      color: "lavender",
      duration: "11 lessons, self-paced",
      price: "Free",
      audience: "Anyone who wants hands-on practice with everyday Microsoft Excel tasks.",
      outcomes: [
        "Building and formatting spreadsheets",
        "Core formulas and functions used in real office work",
        "Charts, sorting, and filtering data",
        "Exam-style practice questions to check real understanding",
      ],
      isFree: true,
      order: 101,
    },
  });
}

async function migrateUsers(rows: WpUserRow[]) {
  const userIdByWpId = new Map<string, string>();

  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      userIdByWpId.set(row.wp_user_id, existing.id);
      continue;
    }

    const created = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        name: row.name?.trim() || email,
        role: "learner",
        emailVerified: false,
      },
    });
    userIdByWpId.set(row.wp_user_id, created.id);
  }

  console.log(`Users: ${userIdByWpId.size} mapped (${rows.length} in export).`);
  return userIdByWpId;
}

async function migrateLessons(rows: WpLessonRow[], videoPathByAttachmentId: Map<string, string>) {
  const courseIdBySlug = new Map<string, string>();
  for (const slug of new Set(Object.values(COURSE_SLUG_BY_WP_ID))) {
    const course = await prisma.course.findUnique({ where: { slug } });
    if (course) courseIdBySlug.set(slug, course.id);
  }

  // WP lessons are nested under topics, so raw lesson_order resets to 1 at
  // the start of every topic — it can't be used as a flat position. The
  // export query already orders rows by (course, topic_order, lesson_order),
  // so a running per-course counter gives the correct flat ordering.
  const positionByCourseId = new Map<string, number>();
  let lessonCount = 0;

  for (const row of rows) {
    const slug = COURSE_SLUG_BY_WP_ID[row.course_id];
    const courseId = slug ? courseIdBySlug.get(slug) : undefined;
    if (!courseId) continue;

    const position = positionByCourseId.get(courseId) ?? 0;
    positionByCourseId.set(courseId, position + 1);

    const attachmentId = extractVideoAttachmentId(row.video_id_raw);
    const relativePath = attachmentId ? videoPathByAttachmentId.get(attachmentId) : undefined;
    const videoUrl = relativePath ? `${VIDEO_BASE}${relativePath}` : null;

    const id = `wp-lesson-${row.lesson_id}`;
    await prisma.lesson.upsert({
      where: { id },
      update: {
        title: row.title.trim(),
        videoUrl,
        position,
      },
      create: {
        id,
        courseId,
        title: row.title.trim(),
        content: "",
        videoUrl,
        position,
        isPublished: true,
      },
    });
    lessonCount++;
  }

  console.log(`Lessons: ${lessonCount} upserted (${rows.length} in export).`);
}

async function migrateEnrollments(
  rows: WpEnrollmentRow[],
  userIdByWpId: Map<string, string>,
  enrolledById: string,
) {
  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const slug = COURSE_SLUG_BY_WP_ID[row.course_id];
    const userId = userIdByWpId.get(row.wp_user_id);
    const course = slug ? await prisma.course.findUnique({ where: { slug } }) : null;

    if (!course || !userId) {
      skipped++;
      continue;
    }

    await prisma.enrollment.upsert({
      where: { courseId_userId: { courseId: course.id, userId } },
      update: {},
      create: {
        courseId: course.id,
        userId,
        enrolledById,
        enrolledAt: new Date(row.enrolled_at),
      },
    });
    created++;
  }

  console.log(
    `Enrollments: ${created} created, ${skipped} skipped (courses with no lesson content, e.g. Scratch Exam / Computational Thinking, have no Course row to enroll into).`,
  );
}

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!admin) {
    throw new Error("No admin user found in this database — seed one first (scripts/seed-admin.ts).");
  }

  await promoteMicrosoftOfficeCourses();

  const users = readRows<WpUserRow>("users.json");
  const lessons = readRows<WpLessonRow>("lessons.json");
  const videoPaths = readRows<WpVideoPathRow>("video_paths.json");
  const enrollments = readRows<WpEnrollmentRow>("enrollments.json");

  const videoPathByAttachmentId = new Map(videoPaths.map((v) => [v.attachment_id, v.relative_path]));

  const userIdByWpId = await migrateUsers(users);
  await migrateLessons(lessons, videoPathByAttachmentId);
  await migrateEnrollments(enrollments, userIdByWpId, admin.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
