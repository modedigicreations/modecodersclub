// One-off cleanup: migrate-wordpress.ts upserted real lessons under
// deterministic "wp-lesson-<id>" ids, all starting at position 0 per course.
// Any lesson that already existed on one of those same 7 courses before the
// migration (placeholder/test content from earlier development) collides
// with that position-0 lesson. Deletes those stray lessons; the migrated
// ones already have correct, gap-free positions so nothing needs renumbering.
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

  const strayLessons = await prisma.lesson.findMany({
    where: {
      courseId: { in: courses.map((c) => c.id) },
      NOT: { id: { startsWith: "wp-lesson-" } },
    },
    include: {
      lab: true,
      assessment: { include: { attempts: true } },
      progress: true,
    },
  });

  if (strayLessons.length === 0) {
    console.log("No stray pre-migration lessons found.");
    return;
  }

  const dryRun = !process.argv.includes("--delete");

  console.log(`${dryRun ? "Would delete" : "Deleting"} ${strayLessons.length} stray lesson(s):`);
  for (const lesson of strayLessons) {
    const courseSlug = courses.find((c) => c.id === lesson.courseId)?.slug;
    console.log(`  - "${lesson.title}" (id=${lesson.id}, course=${courseSlug}, position=${lesson.position})`);
    if (lesson.lab) console.log(`      has a Lab (cascades: instructions="${lesson.lab.instructions.slice(0, 60)}...")`);
    if (lesson.assessment) {
      console.log(
        `      has an Assessment with ${(lesson.assessment.questions as unknown[]).length} question(s), ${lesson.assessment.attempts.length} student attempt(s) recorded (cascades)`,
      );
    }
    if (lesson.progress.length > 0) {
      console.log(`      ${lesson.progress.length} student(s) have marked this lesson complete (cascades)`);
    }
  }

  if (dryRun) {
    console.log("\nDry run only — re-run with --delete to actually remove these.");
    return;
  }

  await prisma.lesson.deleteMany({
    where: { id: { in: strayLessons.map((l) => l.id) } },
  });

  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
