import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { checkAndIncrement } from "@/lib/ai-rate-limit";
import { recordLearning } from "@/lib/achievements";
import { EXPLAIN_DAILY_LIMIT, WRITING_DAILY_LIMIT, aiAvailable, explainMistake, rubricScore, writingFeedback } from "./ai";
import { checkWriting, isCorrect } from "./grading";
import {
  EMPTY_PROGRESS,
  applyAnswer,
  masteryPercent,
  placedReviewDue,
  startPlacement,
  stepPlacement,
  type PlacementState,
} from "./mastery";
import { buildItem, getSkill, toPublic, trackSkills } from "./skills";
import { issueItemToken, newSeed, readItemToken } from "./token";
import type { PublicItem, Skill, Track, TutorItem } from "./types";

export const SESSION_LENGTH = 10;

type ProgressRow = Awaited<ReturnType<typeof prisma.tutorSkillProgress.findMany>>[number];

function kindOf(skill: Skill): TutorItem["kind"] {
  return skill.generate({ next: () => 0, int: (a) => a, pick: (l) => l[0]!, shuffle: (l) => [...l] }).kind;
}

async function progressMap(userId: string, track: Track) {
  const rows = await prisma.tutorSkillProgress.findMany({ where: { userId, track } });
  return new Map(rows.map((r) => [r.skillId, r]));
}

export type SkillView = {
  id: string;
  title: string;
  description: string;
  level: number;
  mastered: boolean;
  placed: boolean;
  percent: number;
  attempts: number;
  accuracy: number | null;
  reviewDue: boolean;
};

export async function getTrackOverview(userId: string, track: Track, now = new Date()) {
  const [map, placement] = await Promise.all([
    progressMap(userId, track),
    prisma.tutorPlacement.findUnique({ where: { userId_track: { userId, track } } }),
  ]);
  const skills: SkillView[] = trackSkills(track).map((s) => {
    const p = map.get(s.id);
    const mastered = Boolean(p?.masteredAt);
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      level: s.level,
      mastered,
      placed: Boolean(p?.placed),
      percent: masteryPercent(p?.recent ?? "", kindOf(s), mastered),
      attempts: p?.attempts ?? 0,
      accuracy: p && p.attempts > 0 ? Math.round((p.correct / p.attempts) * 100) : null,
      reviewDue: mastered && Boolean(p?.reviewDueAt && p.reviewDueAt <= now),
    };
  });
  const current = skills.find((s) => !s.mastered) ?? null;
  const mastered = skills.filter((s) => s.mastered).length;
  return {
    track,
    skills,
    current,
    stage: current?.level ?? skills.at(-1)!.level,
    mastered,
    total: skills.length,
    reviewsDue: skills.filter((s) => s.reviewDue).length,
    placement,
  };
}

export type ServedItem = {
  token: string;
  item: PublicItem;
  skill: { id: string; title: string; level: number };
  review: boolean;
};

function serve(userId: string, skill: Skill, review: boolean, extra?: Partial<Parameters<typeof issueItemToken>[0]>): ServedItem {
  const seed = newSeed();
  const built = buildItem(skill.id, seed)!;
  return {
    token: issueItemToken({ u: userId, s: skill.id, n: seed, m: "practice", ...extra }),
    item: toPublic(built),
    skill: { id: skill.id, title: skill.title, level: skill.level },
    review,
  };
}

/** The next practice question: the current skill, with due reviews mixed in (about 3 in 10). */
export async function nextPracticeItem(userId: string, track: Track, now = new Date(), rand = Math.random): Promise<ServedItem> {
  const ladder = trackSkills(track);
  const map = await progressMap(userId, track);
  const current = ladder.find((s) => !map.get(s.id)?.masteredAt);
  const due = ladder
    .map((s) => ({ s, p: map.get(s.id) }))
    .filter(({ p }) => p?.masteredAt && p.reviewDueAt && p.reviewDueAt <= now)
    .sort((a, b) => a.p!.reviewDueAt!.getTime() - b.p!.reviewDueAt!.getTime());
  if (due.length && (!current || rand() < 0.3)) return serve(userId, due[0]!.s, true);
  if (current) return serve(userId, current, false);
  // Everything mastered: keep sharp on the top of the ladder.
  const top = ladder.filter((s) => s.level === ladder.at(-1)!.level);
  return serve(userId, top[Math.floor(rand() * top.length)]!, true);
}

export type AnswerResult =
  | { ok: false; error: string }
  | {
      ok: true;
      correct: boolean;
      answer: string;
      explain: string;
      justMastered: boolean;
      skillTitle: string;
      newBadges: string[];
    };

async function saveProgress(
  userId: string,
  skill: Skill,
  row: ProgressRow | undefined,
  correct: boolean,
  issuedAt: Date,
  now: Date,
) {
  const next = applyAnswer(row ?? EMPTY_PROGRESS, correct, kindOf(skill), now);
  const data = {
    attempts: next.attempts,
    correct: next.correct,
    recent: next.recent,
    masteredAt: next.masteredAt,
    reviewStep: next.reviewStep,
    reviewDueAt: next.reviewDueAt,
    lastPracticedAt: now,
    lastItemIssuedAt: issuedAt,
  };
  await prisma.tutorSkillProgress.upsert({
    where: { userId_skillId: { userId, skillId: skill.id } },
    create: { userId, skillId: skill.id, track: skill.track, ...data },
    update: data,
  });
  // Streak day + badges: on mastery, the first answer of the day, and every 5th answer.
  const firstToday = !row?.lastPracticedAt || row.lastPracticedAt.toDateString() !== now.toDateString();
  let newBadges: string[] = [];
  if (next.justMastered || firstToday || next.attempts % 5 === 0) {
    newBadges = await recordLearning(userId, now).catch(() => []);
  }
  return { justMastered: next.justMastered, newBadges };
}

async function loadForAnswer(userId: string, token: unknown) {
  const claims = readItemToken(token, userId);
  if (!claims) return { error: "This question has expired. Here's a fresh one." } as const;
  const skill = getSkill(claims.s);
  const item = skill && buildItem(claims.s, claims.n);
  if (!skill || !item) return { error: "Unknown question." } as const;
  return { claims, skill, item } as const;
}

export async function submitPracticeAnswer(userId: string, token: unknown, response: unknown, now = new Date()): Promise<AnswerResult> {
  const loaded = await loadForAnswer(userId, token);
  if ("error" in loaded) return { ok: false, error: loaded.error! };
  const { claims, skill, item } = loaded;
  if (claims.m !== "practice") return { ok: false, error: "Wrong question type." };
  if (item.kind === "write") return { ok: false, error: "Use the writing box for this task." };
  const row = await prisma.tutorSkillProgress.findUnique({ where: { userId_skillId: { userId, skillId: skill.id } } });
  const issuedAt = new Date(claims.t);
  if (row?.lastItemIssuedAt && issuedAt <= row.lastItemIssuedAt) {
    return { ok: false, error: "You've already answered this one." };
  }
  const answerText = typeof response === "string" ? response.slice(0, 300) : "";
  const correct = isCorrect(item, answerText);
  const { justMastered, newBadges } = await saveProgress(userId, skill, row ?? undefined, correct, issuedAt, now);
  return { ok: true, correct, answer: item.answer, explain: item.explain, justMastered, skillTitle: skill.title, newBadges };
}

export type WritingResult =
  | { ok: false; error: string }
  | {
      ok: true;
      passed: boolean;
      score: number;
      aiChecked: boolean;
      tips: string[];
      praise?: string;
      nextStep?: string;
      improved?: string;
      justMastered: boolean;
      newBadges: string[];
    };

/** Marks a writing task: AI rubric feedback when available, otherwise free basic checks. */
export async function submitWriting(userId: string, token: unknown, textRaw: unknown, now = new Date()): Promise<WritingResult> {
  const loaded = await loadForAnswer(userId, token);
  if ("error" in loaded) return { ok: false, error: loaded.error! };
  const { claims, skill, item } = loaded;
  if (item.kind !== "write") return { ok: false, error: "This isn't a writing task." };
  const text = typeof textRaw === "string" ? textRaw.trim().slice(0, 4000) : "";
  if (text.split(/\s+/).filter(Boolean).length < 2) return { ok: false, error: "Write a little more first." };
  const row = await prisma.tutorSkillProgress.findUnique({ where: { userId_skillId: { userId, skillId: skill.id } } });
  const issuedAt = new Date(claims.t);
  if (row?.lastItemIssuedAt && issuedAt <= row.lastItemIssuedAt) return { ok: false, error: "You've already sent this one." };

  const minWords = item.minWords ?? 5;
  const basic = checkWriting(text, minWords);
  let score = Math.round(
    ((basic.meetsLength ? 2 : 0) + (basic.capitalStart ? 1 : 0) + (basic.endsWithStop ? 1 : 0)) * 25,
  );
  let feedback: Record<string, unknown> = { tips: basic.tips };
  let aiChecked = false;
  let praise: string | undefined;
  let nextStep: string | undefined;
  let improved: string | undefined;
  if (aiAvailable() && checkAndIncrement(`tutor-write:${userId}`, WRITING_DAILY_LIMIT)) {
    try {
      const f = await writingFeedback(item.prompt, text, minWords);
      score = rubricScore(f);
      feedback = { ...f, tips: basic.tips };
      aiChecked = true;
      praise = f.praise;
      nextStep = f.nextStep;
      improved = f.improved;
    } catch (error) {
      console.error("[tutor] writing feedback failed:", error instanceof Error ? error.message : error);
    }
  }
  // A piece passes when it's long enough and scores 60%+.
  const passed = basic.meetsLength && score >= 60;
  await prisma.tutorWriting.create({
    data: {
      userId,
      skillId: skill.id,
      prompt: item.prompt.slice(0, 300),
      text,
      score,
      feedback: feedback as Prisma.InputJsonValue,
      passed,
      aiChecked,
    },
  });
  const { justMastered, newBadges } = await saveProgress(userId, skill, row ?? undefined, passed, issuedAt, now);
  return { ok: true, passed, score, aiChecked, tips: basic.tips, praise, nextStep, improved, justMastered, newBadges };
}

/** A friendly AI explanation for a question just answered (daily limit per learner). */
export async function explainItem(userId: string, token: unknown, response: unknown): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const loaded = await loadForAnswer(userId, token);
  if ("error" in loaded) return { ok: false, error: loaded.error! };
  const { skill, item } = loaded;
  if (item.kind === "write") return { ok: false, error: "Writing tasks get their own feedback." };
  if (!aiAvailable()) return { ok: true, text: item.explain };
  if (!checkAndIncrement(`tutor-explain:${userId}`, EXPLAIN_DAILY_LIMIT)) {
    return { ok: false, error: `You've used today's ${EXPLAIN_DAILY_LIMIT} tutor explanations. Here's the short one: ${item.explain}` };
  }
  try {
    return { ok: true, text: await explainMistake(item, typeof response === "string" ? response.slice(0, 300) : "", skill.title) };
  } catch (error) {
    console.error("[tutor] explain failed:", error instanceof Error ? error.message : error);
    return { ok: true, text: item.explain };
  }
}

// ── Placement ───────────────────────────────────────────────────────────────

/** Starting guesses for "where are you now?": index into the ladder by stage. */
export function startIndexForStage(track: Track, stage: number): number {
  const ladder = trackSkills(track);
  const i = ladder.findIndex((s) => s.level >= stage);
  return i === -1 ? ladder.length - 1 : i;
}

/** Writing tasks can't be marked instantly, so placement probes the nearest earlier skill instead. */
function probeSkill(track: Track, index: number): Skill {
  const ladder = trackSkills(track);
  for (let i = Math.min(index, ladder.length - 1); i >= 0; i--) {
    if (kindOf(ladder[i]!) !== "write") return ladder[i]!;
  }
  return ladder[0]!;
}

function servePlacement(userId: string, track: Track, state: PlacementState): ServedItem {
  const skill = probeSkill(track, state.idx);
  return { ...serve(userId, skill, false, { m: "placement", p: state, k: track }), review: false };
}

export function beginPlacement(userId: string, track: Track, stage: number): ServedItem {
  const ladder = trackSkills(track);
  return servePlacement(userId, track, startPlacement(ladder.length, startIndexForStage(track, stage)));
}

export type PlacementAnswer =
  | { ok: false; error: string }
  | { ok: true; correct: boolean; done: false; next: ServedItem; asked: number }
  | { ok: true; correct: boolean; done: true; startSkill: string | null; mastered: number; asked: number };

export async function answerPlacement(userId: string, token: unknown, response: unknown, now = new Date()): Promise<PlacementAnswer> {
  const loaded = await loadForAnswer(userId, token);
  if ("error" in loaded) return { ok: false, error: loaded.error! };
  const { claims, item } = loaded;
  if (claims.m !== "placement" || !claims.p || (claims.k !== "literacy" && claims.k !== "numeracy")) {
    return { ok: false, error: "Wrong question type." };
  }
  const track = claims.k as Track;
  const correct = isCorrect(item, typeof response === "string" ? response.slice(0, 300) : "");
  const stepped = stepPlacement(claims.p, correct);
  if (!stepped.done) {
    return { ok: true, correct, done: false, next: servePlacement(userId, track, stepped.state), asked: stepped.state.asked };
  }
  const ladder = trackSkills(track);
  const startIndex = Math.min(stepped.startIndex, ladder.length);
  await savePlacement(userId, track, startIndex, stepped.state.asked, stepped.state.right, now);
  return {
    ok: true,
    correct,
    done: true,
    startSkill: ladder[startIndex]?.id ?? null,
    mastered: startIndex,
    asked: stepped.state.asked,
  };
}

/** Records the result: skills below the start point count as mastered (with review), unless already practised. */
export async function savePlacement(userId: string, track: Track, startIndex: number, questions: number, right: number, now = new Date()) {
  const ladder = trackSkills(track);
  const start = ladder[startIndex]?.id ?? ladder.at(-1)!.id;
  await prisma.$transaction(async (tx) => {
    await tx.tutorPlacement.upsert({
      where: { userId_track: { userId, track } },
      create: { userId, track, startSkill: start, questions, correct: right, completedAt: now },
      update: { startSkill: start, questions, correct: right, completedAt: now },
    });
    for (const [i, skill] of ladder.slice(0, startIndex).entries()) {
      await tx.tutorSkillProgress.upsert({
        where: { userId_skillId: { userId, skillId: skill.id } },
        create: { userId, skillId: skill.id, track, placed: true, masteredAt: now, reviewDueAt: placedReviewDue(i, now) },
        update: {}, // never overwrite real practice history
      });
    }
  });
}
