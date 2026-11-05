// Ports the original hardcoded catalog (src/lib/courses.ts) into the
// database. Safe to re-run: every row is upserted by its unique slug, so
// this never duplicates or clobbers rows added later through /admin.
import { courses, freeResources } from "../src/lib/courses";
import prisma from "../src/lib/prisma";

async function main() {
  for (const [index, course] of courses.entries()) {
    await prisma.course.upsert({
      where: { slug: course.slug },
      update: {},
      create: { ...course, outcomes: [...course.outcomes], order: index },
    });
  }

  for (const [index, resource] of freeResources.entries()) {
    await prisma.freeResource.upsert({
      where: { slug: resource.slug },
      update: {},
      create: { ...resource, order: index },
    });
  }

  console.info(`Seeded ${courses.length} courses and ${freeResources.length} free resources.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Course seeding failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
