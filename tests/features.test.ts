// Learner-facing features (throwaway DATABASE_URL: writes and deletes rows).
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import prisma from "@/lib/prisma";
import { computeProgress, issueCertificateIfComplete } from "@/lib/course-completion";
import { checkEnrolment, enrol } from "@/lib/enrolment";
import { runSubscriptionReminders } from "@/lib/subscription-reminders";
import { csvCell, getCourseLearnerProgress, progressCsv } from "@/lib/learner-progress";
import { getCourseRating, publicName, saveReview } from "@/lib/reviews";

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
  await prisma.subscription.deleteMany({ where: { userId: { startsWith: P } } });
  await prisma.course.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: P } } });
}

async function paidCourse(id: string, extra: { isDraft?: boolean; archivedAt?: Date } = {}) {
  return prisma.course.create({
    data: {
      id, slug: id, name: id, category: "T", level: "L", description: "D", icon: "x", color: "blue",
      duration: "d", price: "p", audience: "a", outcomes: ["o"], isFree: false, ...extra,
    },
  });
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

describe("F2 self-service enrolment", () => {
  test("free/paid/draft/archived/admin/school rules, and enrolling twice is harmless", async () => {
    const learner = `${P}-enrol-learner`;
    const school = `${P}-enrol-school`;
    await prisma.user.create({ data: { id: learner, name: "Enrol Learner", email: `${learner}@example.com` } });
    await prisma.user.create({ data: { id: school, name: "School Learner", email: `${school}@example.com`, isEnterpriseSso: true } });
    const paid = await paidCourse(`${P}-paid`);
    const draft = await paidCourse(`${P}-draft`, { isDraft: true });
    const archived = await paidCourse(`${P}-archived`, { archivedAt: new Date() });

    assert.deepEqual(await checkEnrolment(learner, ids.course), { ok: true }, "free course is open");
    assert.equal((await checkEnrolment(learner, paid.id) as { reason: string }).reason, "needs_subscription");
    assert.equal((await checkEnrolment(school, paid.id)).ok, true, "school (SSO) learners don't need a subscription");
    assert.equal((await checkEnrolment(learner, draft.id) as { reason: string }).reason, "not_open");
    assert.equal((await checkEnrolment(learner, archived.id) as { reason: string }).reason, "not_open");
    assert.equal((await checkEnrolment(ids.admin, ids.course) as { reason: string }).reason, "admin");

    await prisma.subscription.create({
      data: { userId: learner, paystackReference: `mcc-sub-${learner}`, amountKobo: 500000, expiresAt: new Date(Date.now() + 86_400_000) },
    });
    const first = await enrol(learner, paid.id, learner);
    assert.equal(first.ok && first.created, true, "subscribed learner can enrol in a paid course");
    const again = await enrol(learner, paid.id, learner);
    assert.equal(again.ok && again.created, false);
    assert.equal(await prisma.enrollment.count({ where: { userId: learner, courseId: paid.id } }), 1);
  });
});

describe("F3 subscription reminders", () => {
  test("7-day reminder and expiry notice, once each; not after a renewal; not for old or school subscriptions", async () => {
    const day = 86_400_000;
    const now = new Date();
    const mk = async (key: string, endsInDays: number[], sso = false) => {
      const id = `${P}-rem-${key}`;
      await prisma.user.create({ data: { id, name: key, email: `${id}@example.com`, isEnterpriseSso: sso } });
      for (const [i, d] of endsInDays.entries()) {
        await prisma.subscription.create({
          data: { userId: id, paystackReference: `mcc-sub-${id}-${i}`, amountKobo: 500000, expiresAt: new Date(now.getTime() + d * day) },
        });
      }
      return id;
    };
    const soon = await mk("soon", [5]);
    const renewed = await mk("renewed", [5, 187]);
    const ended = await mk("ended", [-1]);
    const old = await mk("old", [-10]);
    const school = await mk("school", [5], true);

    // Other rows from earlier tests may exist; look only at ours.
    await runSubscriptionReminders(now);
    const row = (u: string) => prisma.subscription.findFirstOrThrow({ where: { userId: u }, orderBy: { expiresAt: "desc" } });
    assert.ok((await row(soon)).reminderSentAt, "reminder sent 5 days before the end");
    assert.equal((await row(renewed)).reminderSentAt, null, "renewed: the latest period ends in 187 days");
    assert.equal((await prisma.subscription.findFirstOrThrow({ where: { userId: renewed }, orderBy: { expiresAt: "asc" } })).reminderSentAt, null);
    const e = await row(ended);
    assert.ok(e.expiredNoticeSentAt, "expiry notice sent");
    assert.equal(e.status, "expired");
    assert.equal((await row(old)).expiredNoticeSentAt, null, "subscriptions that ended long ago are left alone");
    assert.equal((await row(school)).reminderSentAt, null, "school (SSO) learners don't get billing emails");

    const firstSoon = (await row(soon)).reminderSentAt!.getTime();
    const second = await runSubscriptionReminders(new Date(now.getTime() + 60_000));
    assert.equal((await row(soon)).reminderSentAt!.getTime(), firstSoon, "not sent twice");
    assert.equal(second.reminders, 0);
    assert.equal(second.expired, 0);
  });
});

describe("F4 instructor progress", () => {
  test("per-learner progress from published lessons, quizzes and labs; CSV is formula-safe", async () => {
    // Uses the F1 course: the learner finished both published lessons and passed the quiz;
    // the certificate was revoked in that test, so none is shown.
    const formulaName = `${P}-formula`;
    await prisma.user.create({ data: { id: formulaName, name: "=HYPERLINK(\"http://evil\")", email: `${formulaName}@example.com` } });
    await prisma.enrollment.create({ data: { courseId: ids.course, userId: formulaName, enrolledById: ids.admin } });

    const rows = await getCourseLearnerProgress(ids.course);
    const learner = rows.find((r) => r.userId === ids.learner)!;
    assert.equal(learner.totalLessons, 2, "the draft lesson isn't counted");
    assert.equal(learner.lessonsDone, 2);
    assert.equal(learner.percent, 100);
    assert.equal(learner.quizzesPassed, 1);
    assert.equal(learner.quizAverage, 100);
    assert.equal(learner.certificateNumber, null, "revoked certificates aren't shown");
    assert.ok(learner.lastActivity);
    const fresh = rows.find((r) => r.userId === formulaName)!;
    assert.equal(fresh.lessonsDone, 0);
    assert.equal(fresh.quizAverage, null);

    const csv = progressCsv(rows);
    assert.ok(csv.startsWith('"Name","Email","School access (SSO)"'));
    assert.ok(csv.includes(`"'=HYPERLINK(""http://evil"")"`), "formula neutralised and quotes escaped");
    assert.equal(csvCell("-1+2"), `"'-1+2"`);
    assert.equal(csvCell("plain"), `"plain"`);
  });
});

describe("F5 course reviews", () => {
  test("only learners with progress can review; one editable review each; hidden ones don't count", async () => {
    // F1 learner has finished lessons; a fresh enrolment and a stranger can't review.
    const fresh = `${P}-review-fresh`;
    const other = `${P}-review-other`;
    await prisma.user.create({ data: { id: fresh, name: "Fresh", email: `${fresh}@example.com` } });
    await prisma.user.create({ data: { id: other, name: "Other Person Name", email: `${other}@example.com` } });
    await prisma.enrollment.create({ data: { courseId: ids.course, userId: fresh, enrolledById: ids.admin } });
    const otherEnrol = await prisma.enrollment.create({ data: { courseId: ids.course, userId: other, enrolledById: ids.admin } });
    await prisma.lessonProgress.create({ data: { enrollmentId: otherEnrol.id, lessonId: `${P}-l1` } });

    assert.match((await saveReview(fresh, ids.course, 5, ""))!, /Complete at least one lesson/);
    assert.match((await saveReview(`${P}-nobody`, ids.course, 5, ""))!, /Complete at least one lesson/);
    assert.match((await saveReview(ids.learner, ids.course, 6, ""))!, /1 to 5/);
    assert.match((await saveReview(ids.learner, ids.course, "4.5", ""))!, /1 to 5/);
    assert.match((await saveReview(ids.learner, ids.course, 4, "x".repeat(1001)))!, /under 1000/);

    assert.equal(await saveReview(ids.learner, ids.course, "2", "  Meh  "), null);
    assert.equal(await saveReview(ids.learner, ids.course, 5, "Great course"), null, "editing replaces it");
    assert.equal(await saveReview(other, ids.course, 4, ""), null);
    assert.equal(await prisma.courseReview.count({ where: { courseId: ids.course } }), 2);

    let rating = await getCourseRating(ids.course);
    assert.equal(rating.average, 4.5);
    assert.equal(rating.count, 2);
    const mine = rating.reviews.find((r) => r.comment === "Great course")!;
    assert.equal(mine.author, "Feature L.", "public pages show first name and last initial");
    assert.equal(rating.reviews.find((r) => r.rating === 4)!.comment, null, "empty comment stored as null");

    await prisma.courseReview.updateMany({ where: { userId: other }, data: { hiddenAt: new Date() } });
    rating = await getCourseRating(ids.course);
    assert.equal(rating.average, 5);
    assert.equal(rating.count, 1);

    assert.equal(publicName("Ada"), "Ada");
    assert.equal(publicName("  "), "Learner");
  });
});
