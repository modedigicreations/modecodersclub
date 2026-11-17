// Learner-facing features (throwaway DATABASE_URL: writes and deletes rows).
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import prisma from "@/lib/prisma";
import { computeProgress, issueCertificateIfComplete } from "@/lib/course-completion";

if (/railway|rlwy|amazonaws|supabase|neon\.tech/i.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("DATABASE_URL looks like a hosted database; refusing to run tests that write data.");
}

const P = "test-features";
export const ids = {
  learner: `${P}-learner`,
  admin: `${P}-admin`,
  course: `${P}-course`,
};

export async function seedCourse() {
  await prisma.user.upsert({ where: { id: ids.learner }, update: {}, create: { id: ids.learner, name: "Feature Learner", email: `${P}-learner@example.com` } });
  await prisma.user.upsert({ where: { id: ids.admin }, update: {}, create: { id: ids.admin, name: "Feature Admin", email: `${P}-admin@example.com`, role: "admin" } });
  await prisma.course.create({
    data: {
      id: ids.course, slug: `${P}-course`, name: "Feature Course", category: "Test", level: "L", description: "D",
      icon: "</>", color: "blue", duration: "1 week", price: "Free", audience: "A", outcomes: ["O"], isFree: true,
      lessons: {
        create: [
          { id: `${P}-l1`, title: "L1", content: "c", position: 1, isPublished: true,
            assessment: { create: { id: `${P}-a1`, questions: [{ question: "q", options: ["a", "b", "c", "d"], correctIndex: 0 }, { question: "q2", options: ["a", "b", "c", "d"], correctIndex: 1 }] } } },
          { id: `${P}-l2`, title: "L2", content: "c", position: 2, isPublished: true },
          { id: `${P}-l3`, title: "Draft lesson", content: "c", position: 3, isPublished: false },
        ],
      },
    },
  });
  return prisma.enrollment.create({ data: { courseId: ids.course, userId: ids.learner, enrolledById: ids.admin } });
}

export async function cleanup() {
  await prisma.certificate.deleteMany({ where: { OR: [{ userId: ids.learner }, { courseId: ids.course }] } });
  await prisma.course.deleteMany({ where: { id: ids.course } });
  await prisma.user.deleteMany({ where: { id: { in: [ids.learner, ids.admin] } } });
}

before(async () => {
  await cleanup();
});
after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("F1 automatic certificates", () => {
  test("progress counts only published lessons and needs every quiz passed", () => {
    const base = {
      publishedLessonIds: ["a", "b"],
      quizLessonIds: ["a", "draft"],
      completedLessonIds: ["a", "b", "draft"],
      passPercent: 70,
    };
    assert.equal(computeProgress({ ...base, quizScores: new Map() }).complete, false, "quiz not taken");
    assert.equal(computeProgress({ ...base, quizScores: new Map([["a", { score: 1, total: 2 }]]) }).complete, false, "50% < 70%");
    const done = computeProgress({ ...base, quizScores: new Map([["a", { score: 2, total: 2 }]]) });
    assert.equal(done.complete, true);
    assert.equal(done.completedLessons, 2, "the unpublished lesson's progress doesn't count");
    assert.equal(done.quizzesTotal, 1, "the unpublished lesson's quiz isn't required");
    assert.equal(computeProgress({ ...base, publishedLessonIds: [], quizScores: new Map() }).complete, false, "empty course");
  });

  test("issued once when the course is finished; never twice; not re-issued after revocation", async () => {
    const enrollment = await seedCourse();
    assert.equal(await issueCertificateIfComplete(ids.learner, ids.course), null, "nothing done yet");

    for (const lessonId of [`${P}-l1`, `${P}-l2`]) {
      await prisma.lessonProgress.create({ data: { enrollmentId: enrollment.id, lessonId } });
    }
    await prisma.assessmentAttempt.create({ data: { assessmentId: `${P}-a1`, userId: ids.learner, answers: [0, 0], score: 1, total: 2 } });
    assert.equal(await issueCertificateIfComplete(ids.learner, ids.course), null, "quiz at 50% isn't a pass");

    await prisma.assessmentAttempt.update({
      where: { assessmentId_userId: { assessmentId: `${P}-a1`, userId: ids.learner } },
      data: { answers: [0, 1], score: 2 },
    });
    const results = await Promise.all([1, 2, 3].map(() => issueCertificateIfComplete(ids.learner, ids.course)));
    assert.equal(results.filter(Boolean).length, 1, "three simultaneous completions issue one certificate");
    const cert = results.find(Boolean)!;
    assert.equal(cert.recipientName, "Feature Learner");
    assert.equal(cert.courseName, "Feature Course");
    assert.equal(cert.issuedById, null);
    assert.match(cert.certificateNumber, /^MCC-\d{4}-[0-9A-F]{12}$/);

    await prisma.certificate.update({ where: { id: cert.id }, data: { status: "REVOKED", revokedAt: new Date(), revocationReason: "test" } });
    assert.equal(await issueCertificateIfComplete(ids.learner, ids.course), null, "an admin's revocation sticks");
    assert.equal(await prisma.certificate.count({ where: { userId: ids.learner, courseId: ids.course } }), 1);
  });
});
