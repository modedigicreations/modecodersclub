import prisma from "@/lib/prisma";
import { COURSE_GENERATE_MODEL } from "@/lib/anthropic";
import { CurriculumSchema, LessonDraftSchema, type LessonDraft } from "./schemas";
import { cleanCurriculum, cleanLab, cleanQuiz, lessonContent, slugify, type PlannedLesson } from "./clamp";
import { CURRICULUM_SYSTEM, LESSON_SYSTEM, curriculumPrompt, lessonPrompt } from "./prompts";
import { GenerationError, claudeStructuredCall, type StructuredCall } from "./claude";

export const LESSON_MIN = 4;
export const LESSON_MAX = 24;
/** Courses one admin may start in 24 hours (each one is a paid API run). */
export const DAILY_JOB_LIMIT = Number(process.env.COURSE_GENERATE_DAILY_LIMIT || 5);
/** A running job with no progress for this long was interrupted (server restart/deploy). */
const STALE_MS = 15 * 60 * 1000;
const LESSON_CONCURRENCY = 3;
const LESSON_ATTEMPTS = 2;

export type JobInput = {
  topic: string;
  audience: string;
  level: string;
  lessonTarget: number;
  includeLabs: boolean;
  autoPublish: boolean;
  isFree: boolean;
  price: string;
};

/** Checks limits and records a queued job. The caller runs it with runGenerationJob (in the background). */
export async function createGenerationJob(userId: string, input: JobInput) {
  await failStaleJobs();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [recent, running] = await Promise.all([
    prisma.courseGenerationJob.count({ where: { createdById: userId, createdAt: { gte: since } } }),
    prisma.courseGenerationJob.count({ where: { createdById: userId, status: { in: ["queued", "running"] } } }),
  ]);
  if (running > 0) throw new GenerationError("A course is already being generated. Wait for it to finish.");
  if (recent >= DAILY_JOB_LIMIT) {
    throw new GenerationError(`You've generated ${DAILY_JOB_LIMIT} courses in the last 24 hours. Try again later.`);
  }
  return prisma.courseGenerationJob.create({
    data: {
      createdById: userId,
      topic: input.topic,
      audience: input.audience,
      level: input.level,
      lessonTarget: input.lessonTarget,
      includeLabs: input.includeLabs,
      autoPublish: input.autoPublish,
      isFree: input.isFree,
      price: input.price.slice(0, 80),
      model: COURSE_GENERATE_MODEL,
      stage: "Queued",
    },
  });
}

/** Marks jobs stuck in "running"/"queued" (e.g. the server restarted mid-run) as failed. */
export async function failStaleJobs() {
  await prisma.courseGenerationJob.updateMany({
    where: { status: { in: ["queued", "running"] }, updatedAt: { lt: new Date(Date.now() - STALE_MS) } },
    data: { status: "failed", error: "Generation was interrupted (the server restarted). Start it again.", finishedAt: new Date() },
  });
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function uniqueSlug(name: string) {
  const base = slugify(name);
  for (let n = 1; n < 50; n++) {
    const slug = n === 1 ? base : `${base}-${n}`.slice(0, 80);
    if (!(await prisma.course.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  return `${base.slice(0, 60)}-${Date.now().toString(36)}`;
}

/**
 * Runs one job end to end (A-EduNet phases):
 *   1. Curriculum Agent plans the course and its lessons.
 *   2. Content + Assessment Agents write each lesson, its quiz and (if wanted) a lab, in parallel.
 *   3. Packaging: everything is saved in one transaction — a draft course unless autoPublish.
 * The PDF handbook is built on demand from the saved course (src/lib/course-handbook.ts).
 */
export async function runGenerationJob(
  jobId: string,
  options: { call?: StructuredCall } = {},
) {
  const call = options.call ?? claudeStructuredCall;
  const job = await prisma.courseGenerationJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "queued") return;

  let inputTokens = 0;
  let outputTokens = 0;
  let model = job.model;
  const track = (r: { inputTokens: number; outputTokens: number; model: string }) => {
    inputTokens += r.inputTokens;
    outputTokens += r.outputTokens;
    model = r.model || model;
  };
  const update = (data: Parameters<typeof prisma.courseGenerationJob.update>[0]["data"]) =>
    prisma.courseGenerationJob.update({ where: { id: jobId }, data: { ...data, inputTokens, outputTokens, model } });

  try {
    await update({ status: "running", startedAt: new Date(), stage: "Planning the curriculum" });

    // Phase 1: curriculum
    const plan = await call({
      schema: CurriculumSchema,
      system: CURRICULUM_SYSTEM,
      prompt: curriculumPrompt(job),
      maxTokens: 16000,
    });
    track(plan);
    const { course, lessons: outline } = cleanCurriculum(plan.data, job.lessonTarget);
    if (outline.length < Math.min(LESSON_MIN, job.lessonTarget)) {
      throw new GenerationError("The curriculum came back with too few lessons. Try again with a clearer topic.");
    }
    await update({ stage: `Writing ${outline.length} lessons`, lessonsTotal: outline.length, lessonsDone: 0 });

    // Phase 2: lessons, quizzes and labs (parallel)
    let done = 0;
    const drafts = await mapLimit(outline, LESSON_CONCURRENCY, async (lesson: PlannedLesson, index) => {
      const withLab = job.includeLabs && lesson.hasCodingLab;
      let draft: LessonDraft | null = null;
      for (let attempt = 1; attempt <= LESSON_ATTEMPTS && !draft; attempt++) {
        try {
          const r = await call({
            schema: LessonDraftSchema,
            system: LESSON_SYSTEM,
            prompt: lessonPrompt({ course, outline, index, level: job.level, withLab }),
            maxTokens: 16000,
          });
          track(r);
          draft = r.data;
        } catch (err) {
          console.error(`[course-generator] lesson ${index + 1} attempt ${attempt} failed:`, err instanceof Error ? err.message : err);
        }
      }
      done++;
      // Never move the counter backwards when parallel writes finish out of order.
      await prisma.courseGenerationJob.updateMany({
        where: { id: jobId, lessonsDone: { lt: done } },
        data: { lessonsDone: done, stage: `Writing lessons (${done} of ${outline.length})`, inputTokens, outputTokens },
      });
      return draft ? { lesson, draft, withLab } : null;
    });

    const written = drafts.filter((d): d is NonNullable<typeof d> => d !== null);
    const missing = outline.length - written.length;
    if (written.length === 0 || missing > Math.floor(outline.length / 4)) {
      throw new GenerationError(`${missing} of ${outline.length} lessons couldn't be written. Nothing was saved; try again.`);
    }

    // Phase 3: save the course in one go
    await update({ stage: "Saving the course" });
    const slug = await uniqueSlug(course.name);
    const last = await prisma.course.aggregate({ _max: { order: true } });
    const publish = job.autoPublish;
    const isFree = job.isFree;
    const price = (job.price || (isFree ? "Free" : "Included with subscription")).slice(0, 80);

    const created = await prisma.$transaction(
      async (tx) => {
        const c = await tx.course.create({
          data: {
            ...course,
            slug,
            price,
            isFree,
            isDraft: !publish,
            order: (last._max.order ?? 0) + 1,
          },
        });
        for (const [position, { lesson, draft, withLab }] of written.entries()) {
          const quiz = cleanQuiz(draft.quiz);
          const lab = withLab ? cleanLab(draft.lab) : null;
          await tx.lesson.create({
            data: {
              courseId: c.id,
              title: lesson.title.slice(0, 160),
              content: lessonContent(lesson, draft.content),
              position: position + 1,
              isPublished: publish,
              ...(quiz.length >= 3 ? { assessment: { create: { questions: quiz } } } : {}),
              ...(lab ? { lab: { create: { ...lab, hintsEnabled: true } } } : {}),
            },
          });
        }
        return c;
      },
      { timeout: 60_000 },
    );

    await update({
      status: "succeeded",
      courseId: created.id,
      // Per-lesson progress writes run in parallel and may land out of order: set the final count here.
      lessonsDone: outline.length,
      finishedAt: new Date(),
      stage: publish ? "Published" : "Draft ready for review",
      error: missing > 0 ? `${missing} lesson(s) couldn't be written and were left out; add them by hand.` : null,
    });
    return created;
  } catch (err) {
    const message =
      err instanceof GenerationError
        ? err.message
        : "Generation failed unexpectedly. Check the server log and try again.";
    console.error("[course-generator] job failed:", err);
    await update({ status: "failed", error: message.slice(0, 500), finishedAt: new Date() }).catch(() => {});
    return null;
  }
}
