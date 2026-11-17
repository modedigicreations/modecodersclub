// AI course generator (A-EduNet) and course handbook.
// Run: npm test   (needs DATABASE_URL pointing at a THROWAWAY database: it creates and deletes rows)
// Claude is replaced by a fake StructuredCall, so these tests cost nothing and never call the API.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import prisma from "@/lib/prisma";
import { cleanCurriculum, cleanQuiz, clampText, lessonContent, slugify } from "@/lib/course-generator/clamp";
import { DAILY_JOB_LIMIT, createGenerationJob, failStaleJobs, runGenerationJob, type JobInput } from "@/lib/course-generator/run";
import { GenerationError, type StructuredCall } from "@/lib/course-generator/claude";
import { CurriculumSchema, type Curriculum, type LessonDraft } from "@/lib/course-generator/schemas";
import { buildCourseHandbook, pdfSafe } from "@/lib/course-handbook";

if (/railway|rlwy|amazonaws|supabase|neon\.tech/i.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("DATABASE_URL looks like a hosted database; refusing to run tests that write data.");
}

const ADMIN_ID = "test-admin-course-generator";

function curriculum(lessonsPerModule = [3, 3]): Curriculum {
  return {
    course: {
      name: "Build Your First Website — HTML, CSS & JavaScript",
      category: "Web development",
      tagline: "From a blank file to a live page",
      description: "A hands-on introduction to building web pages.",
      icon: "🌐</>",
      color: "mint",
      duration: "6 weeks, 2 sessions a week",
      audience: "Secondary-school students with no coding experience.",
      outcomes: ["Write semantic HTML", "Style pages with CSS", "Add interactivity with JavaScript"],
    },
    modules: lessonsPerModule.map((n, m) => ({
      title: `Module title ${m + 1}`,
      lessons: Array.from({ length: n }, (_, i) => ({
        title: `Lesson ${m + 1}.${i + 1} title`,
        objectives: ["Do one thing", "Do another"],
        hasCodingLab: i === 0,
      })),
    })),
  };
}

function lessonDraft(title: string): LessonDraft {
  return {
    content: `Intro to ${title}.\n\nHeading\n\n- point one\n- point two\n\n    console.log("hi");\n\nRecap.`,
    quiz: [
      { question: "Q1?", options: ["a", "b", "c", "d"], correctIndex: 1 },
      { question: "Q2?", options: ["a", "b", "c", "d"], correctIndex: 0 },
      { question: "Q3?", options: ["a", "b", "c", "d"], correctIndex: 3 },
      { question: "Bad: 3 options", options: ["a", "b", "c"], correctIndex: 0 },
      { question: "Bad: index", options: ["a", "b", "c", "d"], correctIndex: 7 },
    ],
    lab: { instructions: "Make the button say hello.", starterHtml: "<button>Click</button>", starterCss: "", starterJs: "// TODO", checks: ["js: addEventListener | Listen for clicks", "nonsense line"] },
  };
}

type FakeOptions = { failLessonsOnce?: Set<number>; failLessonsAlways?: Set<number>; failCurriculum?: boolean; lessons?: number[] };
function fakeClaude(opts: FakeOptions = {}): { call: StructuredCall; calls: { prompt: string }[] } {
  const calls: { prompt: string }[] = [];
  const failedOnce = new Set<number>();
  const call = (async ({ schema, prompt }) => {
    calls.push({ prompt });
    if ((schema as unknown) === CurriculumSchema) {
      if (opts.failCurriculum) throw new GenerationError("Claude declined to write this part of the course.");
      return { data: curriculum(opts.lessons), inputTokens: 1000, outputTokens: 2000, model: "claude-opus-5-5" };
    }
    const n = Number(/Write lesson (\d+):/.exec(prompt)?.[1]);
    if (opts.failLessonsAlways?.has(n)) throw new Error("boom");
    if (opts.failLessonsOnce?.has(n) && !failedOnce.has(n)) {
      failedOnce.add(n);
      throw new Error("transient");
    }
    return { data: lessonDraft(`lesson ${n}`), inputTokens: 500, outputTokens: 1500, model: "claude-opus-5-5" };
  }) as StructuredCall;
  return { call, calls };
}

// Only this file's generated courses (other test files add courses in parallel).
const generatedCourses = () => prisma.course.count({ where: { name: curriculum().course.name } });

const input = (over: Partial<JobInput> = {}): JobInput => ({
  topic: "Build your first website",
  audience: "Secondary-school students",
  level: "Beginner",
  lessonTarget: 6,
  includeLabs: true,
  autoPublish: false,
  isFree: false,
  price: "Included with subscription",
  ...over,
});

async function cleanup() {
  const jobs = await prisma.courseGenerationJob.findMany({ where: { createdById: ADMIN_ID }, select: { courseId: true } });
  const ids = jobs.map((j) => j.courseId).filter((x): x is string => Boolean(x));
  await prisma.courseGenerationJob.deleteMany({ where: { createdById: ADMIN_ID } });
  await prisma.course.deleteMany({ where: { id: { in: ids } } });
}

before(async () => {
  await prisma.user.upsert({
    where: { id: ADMIN_ID },
    update: {},
    create: { id: ADMIN_ID, name: "Test Admin", email: "test-admin-generator@example.com", role: "admin" },
  });
  await cleanup();
});
after(async () => {
  await cleanup();
  await prisma.user.delete({ where: { id: ADMIN_ID } }).catch(() => {});
  await prisma.$disconnect();
});

describe("clean-up of Claude output", () => {
  test("course fields fit the database columns and the badge", () => {
    const raw = curriculum();
    raw.course.name = "x".repeat(300);
    raw.course.description = "word ".repeat(200);
    raw.course.color = "purple" as never;
    const { course, lessons } = cleanCurriculum(raw, 4);
    assert.ok(course.name.length <= 120);
    assert.ok(course.description.length <= 500);
    assert.equal(course.icon, "</>", "non-ASCII stripped, at most 4 characters");
    assert.equal(course.color, "blue", "unknown colour falls back");
    assert.equal(lessons.length, 4, "capped at the requested lesson count");
    assert.equal(lessons[3]!.moduleNumber, 2);
  });

  test("quiz keeps only well-formed 4-option questions", () => {
    const q = cleanQuiz(lessonDraft("x").quiz);
    assert.equal(q.length, 3);
    assert.ok(q.every((x) => x.options.length === 4 && x.correctIndex >= 0 && x.correctIndex <= 3));
    assert.equal(cleanQuiz([{ question: "dup", options: ["a", "A", "b", "c"], correctIndex: 0 }]).length, 0);
  });

  test("text clamps on a boundary; lesson content fits 8000 characters; slugs are URL-safe", () => {
    assert.equal(clampText("Hello world. Again", 14), "Hello world.");
    const long = lessonContent({ moduleNumber: 1, moduleTitle: "M", title: "T", objectives: [], hasCodingLab: false }, "word ".repeat(3000));
    assert.ok(long.length <= 8000 && long.startsWith("Module 1: M"));
    assert.equal(slugify("Build Your First Website — HTML, CSS & JavaScript"), "build-your-first-website-html-css-javascript");
    assert.equal(slugify("ÉÉÉ"), "eee");
    assert.equal(slugify("!!!"), "course");
  });
});

describe("generation job", () => {
  test("creates a draft course: lessons unpublished, quizzes cleaned, labs only where asked; retries a failed lesson", async () => {
    const job = await createGenerationJob(ADMIN_ID, input());
    const fake = fakeClaude({ failLessonsOnce: new Set([2]) });
    const course = await runGenerationJob(job.id, { call: fake.call });
    assert.ok(course);

    const saved = await prisma.course.findUniqueOrThrow({
      where: { id: course.id },
      include: { lessons: { orderBy: { position: "asc" }, include: { assessment: true, lab: true } } },
    });
    assert.equal(saved.isDraft, true);
    assert.equal(saved.isFree, false);
    assert.equal(saved.price, "Included with subscription");
    assert.equal(saved.lessons.length, 6);
    assert.ok(saved.lessons.every((l) => !l.isPublished));
    assert.deepEqual(saved.lessons.map((l) => l.position), [1, 2, 3, 4, 5, 6]);
    assert.ok(saved.lessons[0]!.content.startsWith("Module 1: Module title 1"));
    const questions = saved.lessons[0]!.assessment!.questions as { options: string[] }[];
    assert.equal(questions.length, 3, "the two malformed questions were dropped");
    assert.deepEqual(saved.lessons.map((l) => Boolean(l.lab)), [true, false, false, true, false, false]);
    assert.equal(saved.lessons[0]!.lab!.hintsEnabled, true);
    assert.deepEqual(saved.lessons[0]!.lab!.checks, [{ kind: "js", text: "addEventListener", message: "Listen for clicks" }], "unreadable checks dropped");

    const done = await prisma.courseGenerationJob.findUniqueOrThrow({ where: { id: job.id } });
    assert.equal(done.status, "succeeded");
    assert.equal(done.lessonsDone, 6);
    assert.equal(done.courseId, course.id);
    assert.equal(done.inputTokens, 1000 + 6 * 500);
    assert.equal(done.outputTokens, 2000 + 6 * 1500);
    assert.equal(fake.calls.length, 1 + 6 + 1, "curriculum + 6 lessons + 1 retry");
    assert.match(fake.calls[1]!.prompt, /Lab requested: yes/);
  });

  test("labs switched off: no labs even where they would fit; second course gets a unique slug", async () => {
    const job = await createGenerationJob(ADMIN_ID, input({ includeLabs: false }));
    const course = await runGenerationJob(job.id, { call: fakeClaude().call });
    const labs = await prisma.lab.count({ where: { lesson: { courseId: course!.id } } });
    assert.equal(labs, 0);
    assert.match(course!.slug, /-2$/);
  });

  test("auto-publish (only when ticked) publishes the course and every lesson", async () => {
    const job = await createGenerationJob(ADMIN_ID, input({ autoPublish: true, isFree: true, price: "Free" }));
    const course = await runGenerationJob(job.id, { call: fakeClaude().call });
    const saved = await prisma.course.findUniqueOrThrow({ where: { id: course!.id }, include: { lessons: true } });
    assert.equal(saved.isDraft, false);
    assert.equal(saved.isFree, true);
    assert.ok(saved.lessons.every((l) => l.isPublished));
  });

  test("a refused curriculum fails the job and saves nothing", async () => {
    const before = await generatedCourses();
    const job = await createGenerationJob(ADMIN_ID, input());
    assert.equal(await runGenerationJob(job.id, { call: fakeClaude({ failCurriculum: true }).call }), null);
    const failed = await prisma.courseGenerationJob.findUniqueOrThrow({ where: { id: job.id } });
    assert.equal(failed.status, "failed");
    assert.match(failed.error ?? "", /declined/);
    assert.equal(await generatedCourses(), before);
  });

  test("too many lessons failing fails the job and saves nothing; one failure is left out and reported", async () => {
    await cleanup(); // stay under the daily limit
    const before = await generatedCourses();
    const bad = await createGenerationJob(ADMIN_ID, input());
    await runGenerationJob(bad.id, { call: fakeClaude({ failLessonsAlways: new Set([1, 2, 3]) }).call });
    assert.equal((await prisma.courseGenerationJob.findUniqueOrThrow({ where: { id: bad.id } })).status, "failed");
    assert.equal(await generatedCourses(), before);

    const ok = await createGenerationJob(ADMIN_ID, input());
    const course = await runGenerationJob(ok.id, { call: fakeClaude({ failLessonsAlways: new Set([4]) }).call });
    assert.equal(await prisma.lesson.count({ where: { courseId: course!.id } }), 5);
    const job = await prisma.courseGenerationJob.findUniqueOrThrow({ where: { id: ok.id } });
    assert.equal(job.status, "succeeded");
    assert.match(job.error ?? "", /1 lesson\(s\) couldn't be written/);
  });

  test("one job at a time, a daily limit, and a job runs only once", async () => {
    await cleanup();
    const queued = await createGenerationJob(ADMIN_ID, input());
    await assert.rejects(() => createGenerationJob(ADMIN_ID, input()), /already being generated/);
    await runGenerationJob(queued.id, { call: fakeClaude().call });
    const again = await runGenerationJob(queued.id, { call: fakeClaude().call });
    assert.equal(again, undefined, "a finished job is not run twice");
    for (let i = 1; i < DAILY_JOB_LIMIT; i++) {
      const j = await createGenerationJob(ADMIN_ID, input());
      await runGenerationJob(j.id, { call: fakeClaude().call });
    }
    await assert.rejects(() => createGenerationJob(ADMIN_ID, input()), /in the last 24 hours/);
  });

  test("a job left running by a restart is marked failed", async () => {
    await prisma.courseGenerationJob.deleteMany({ where: { createdById: ADMIN_ID, courseId: null } });
    const stuck = await prisma.courseGenerationJob.create({
      data: { createdById: ADMIN_ID, topic: "t", audience: "a", level: "Beginner", lessonTarget: 4, status: "running" },
    });
    await prisma.$executeRaw`UPDATE "CourseGenerationJob" SET "updatedAt" = now() - interval '1 hour' WHERE id = ${stuck.id}`;
    await failStaleJobs();
    const row = await prisma.courseGenerationJob.findUniqueOrThrow({ where: { id: stuck.id } });
    assert.equal(row.status, "failed");
    assert.match(row.error ?? "", /interrupted/);
  });
});

describe("course handbook PDF", () => {
  test("cover, contents and one page per lesson; quiz answers are not printed; unicode is safe", async () => {
    const bytes = await buildCourseHandbook({
      name: "Build Your First Website — HTML & CSS",
      level: "From a blank file to a live page",
      description: "Learn “real” web skills… for ₦0.",
      audience: "Students",
      duration: "6 weeks",
      outcomes: ["One", "Two"],
      isDraft: true,
      lessons: [1, 2, 3].map((i) => ({
        title: `Lesson ${i}`,
        content: lessonDraft(`l${i}`).content + "\n" + "A long paragraph. ".repeat(400),
        isPublished: false,
        assessment: { questions: cleanQuiz(lessonDraft("x").quiz) },
        lab: { instructions: "Do the lab." },
      })),
    });
    assert.equal(Buffer.from(bytes.subarray(0, 5)).toString(), "%PDF-");
    const pdf = await PDFDocument.load(bytes);
    assert.ok(pdf.getPageCount() >= 2 + 3 + 3, `long lessons flow onto extra pages (got ${pdf.getPageCount()})`);
    assert.equal(pdfSafe("“Quote” — ₦5,000 • done…"), "\"Quote\" - NGN 5,000 - done...");
  });
});
