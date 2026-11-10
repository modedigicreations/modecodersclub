// One-off cleanup: migrate-wordpress.ts upserted real lessons under
// deterministic "wp-lesson-<id>" ids, all starting at position 0 per course.
// On courses that already had a lesson before the migration (e.g. Java
// Programming's "Lesson 1: Variables and Data Types", which has a real
// Lab, Assessment, and recorded student progress — not safe to delete),
// that collides with the migrated lessons' own position 0. This keeps the
// pre-existing lesson(s) exactly where they are and shifts the migrated
// ones to start right after, preserving their relative order.
import prisma from "../src/lib/prisma";

const MIGRATED_COURSE_SLUGS = [
  "full-stack-web-development",
  "cybersecurity",
  "data-science",
  "ui-ux-design",
  "java-programming",
  "microsoft-excel",
  "microsoft-word",
];

async function main() {
  const courses = await prisma.course.findMany({
    where: { slug: { in: MIGRATED_COURSE_SLUGS } },
    select: { id: true, slug: true },
  });

  const apply = process.argv.includes("--apply");

  for (const course of courses) {
    const lessons = await prisma.lesson.findMany({
      where: { courseId: course.id },
      orderBy: { position: "asc" },
    });

    const strayLessons = lessons.filter((l) => !l.id.startsWith("wp-lesson-"));
    const migratedLessons = lessons.filter((l) => l.id.startsWith("wp-lesson-"));

    if (strayLessons.length === 0) continue;

    const strayMaxPosition = Math.max(...strayLessons.map((l) => l.position));
    const collisions = migratedLessons.filter((l) => l.position <= strayMaxPosition);
    if (collisions.length === 0) continue;

    console.log(`${course.slug}: shifting ${migratedLessons.length} migrated lesson(s) after position ${strayMaxPosition}`);
    for (const [index, lesson] of migratedLessons.entries()) {
      const newPosition = strayMaxPosition + 1 + index;
      if (newPosition === lesson.position) continue;
      console.log(`  - "${lesson.title}": position ${lesson.position} -> ${newPosition}`);
      if (apply) {
        await prisma.lesson.update({ where: { id: lesson.id }, data: { position: newPosition } });
      }
    }
  }

  if (!apply) {
    console.log("\nDry run only — re-run with --apply to actually update positions.");
  } else {
    console.log("\nDone.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
