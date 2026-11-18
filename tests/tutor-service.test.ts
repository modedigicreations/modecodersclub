// Tutor service against a throwaway database (writes and deletes rows).
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import prisma from "@/lib/prisma";
import { buildItem } from "@/lib/tutor/skills";
import { readItemToken } from "@/lib/tutor/token";
import { canViewTutorReport } from "@/lib/tutor/class-report";
import {
  answerPlacement,
  explainItem,
  beginPlacement,
  getTrackOverview,
  nextPracticeItem,
  submitPracticeAnswer,
  submitWriting,
  type ServedItem,
} from "@/lib/tutor/service";

if (/railway|rlwy|amazonaws|supabase|neon\.tech/i.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("DATABASE_URL looks like a hosted database; refusing to run tests that write data.");
}

const P = "test-tutor";
const learner = `${P}-learner`;
const other = `${P}-other`;
const placer = `${P}-placer`;
const racer = `${P}-racer`;

function answerOf(userId: string, served: ServedItem): string {
  const claims = readItemToken(served.token, userId)!;
  return buildItem(claims.s, claims.n)!.answer;
}

async function cleanup() {
  await prisma.user.deleteMany({ where: { id: { startsWith: P } } });
}

before(async () => {
  await cleanup();
  for (const id of [learner, other, placer, racer]) {
    await prisma.user.create({ data: { id, name: id, email: `${id}@example.com` } });
  }
});
after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("tutor service", () => {
  test("practice: answers are marked on the server; 8 right masters the first skill and moves on", async () => {
    const delete_key = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    let first = await nextPracticeItem(learner, "numeracy");
    assert.equal(first.skill.id, "n01-count");
    assert.ok(!("answer" in first.item), "no answer sent to the browser");

    const wrong = await submitPracticeAnswer(learner, first.token, "999");
    assert.ok(wrong.ok && !wrong.correct);
    if (wrong.ok) assert.ok(wrong.answer.length > 0 && wrong.explain.length > 0, "shows the right answer and why");

    const replay = await submitPracticeAnswer(learner, first.token, answerOf(learner, first));
    assert.equal(replay.ok, false, "a question can't be answered twice");
    const stolen = await submitPracticeAnswer(other, (await nextPracticeItem(learner, "numeracy")).token, "1");
    assert.equal(stolen.ok, false, "another learner's question is refused");
    const forged = await submitPracticeAnswer(learner, first.token.replace(/.$/, (c) => (c === "A" ? "B" : "A")), "1");
    assert.equal(forged.ok, false, "edited tokens are refused");

    let mastered = false;
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 2)); // distinct issue times
      first = await nextPracticeItem(learner, "numeracy");
      assert.equal(first.skill.id, "n01-count");
      const res = await submitPracticeAnswer(learner, first.token, answerOf(learner, first));
      assert.ok(res.ok && res.correct);
      if (res.ok && res.justMastered) mastered = true;
    }
    assert.ok(mastered, "mastered after 8 right in the last 10");
    const overview = await getTrackOverview(learner, "numeracy");
    assert.equal(overview.mastered, 1);
    assert.equal(overview.current?.id, "n02-compare");
    const next = await nextPracticeItem(learner, "numeracy", new Date(), () => 0.9);
    assert.equal(next.skill.id, "n02-compare", "moves on to the next skill");
    const reviewLater = await nextPracticeItem(learner, "numeracy", new Date(Date.now() + 2 * 86_400_000), () => 0.1);
    assert.equal(reviewLater.review, true, "a due review gets mixed in");
    assert.equal(reviewLater.skill.id, "n01-count");
    if (delete_key) process.env.ANTHROPIC_API_KEY = delete_key;
  });

  test("the same question sent twice at once is marked once; explanations only after answering", async () => {
    const key = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const first = await nextPracticeItem(racer, "numeracy");
    const early = await explainItem(racer, first.token, "");
    assert.equal(early.ok, false, "no explanation (with the answer) before answering");
    const right = answerOf(racer, first);
    const results = await Promise.all([1, 2, 3, 4].map(() => submitPracticeAnswer(racer, first.token, right)));
    assert.equal(results.filter((r) => r.ok).length, 1, "only one of four identical answers counts");
    assert.ok(results.filter((r) => !r.ok).every((r) => !r.ok && r.stale), "the rest are told to load a fresh question");
    const row = await prisma.tutorSkillProgress.findUnique({ where: { userId_skillId: { userId: racer, skillId: first.skill.id } } });
    assert.equal(row?.attempts, 1);
    const later = await explainItem(racer, first.token, "");
    assert.ok(later.ok, "explanation available after answering");

    await new Promise((r) => setTimeout(r, 2));
    const a = await nextPracticeItem(racer, "numeracy");
    await new Promise((r) => setTimeout(r, 2));
    const b = await nextPracticeItem(racer, "numeracy");
    assert.ok((await submitPracticeAnswer(racer, b.token, answerOf(racer, b))).ok);
    const old = await submitPracticeAnswer(racer, a.token, answerOf(racer, a));
    assert.ok(!old.ok && old.stale, "an older question left open in another tab is replaced, not stuck");
    if (key) process.env.ANTHROPIC_API_KEY = key;
  });

  test("tutor report: admins and assigned instructors only", async () => {
    assert.equal(await canViewTutorReport({ id: other, role: "learner" }), false);
    assert.equal(await canViewTutorReport({ id: other, role: "instructor" }), false, "self-registered instructor");
    assert.equal(await canViewTutorReport({ id: other, role: "admin" }), true);
  });

  test("placement: a learner who knows the first 6 maths skills starts on the 7th", async () => {
    const knows = 5;
    const ladder = (await getTrackOverview(placer, "numeracy")).skills.map((s) => s.id);
    let served = beginPlacement(placer, "numeracy", 1);
    let done = false;
    for (let guard = 0; guard < 20 && !done; guard++) {
      const claims = readItemToken(served.token, placer)!;
      const idx = claims.p!.idx;
      const res = await answerPlacement(placer, served.token, idx <= knows ? answerOf(placer, served) : "999");
      assert.ok(res.ok);
      if (res.ok && res.done) {
        done = true;
        assert.equal(res.startSkill, ladder[knows + 1]);
        assert.ok(res.asked <= 14);
      } else if (res.ok && !res.done) {
        served = res.next;
      }
    }
    assert.ok(done);
    const overview = await getTrackOverview(placer, "numeracy");
    assert.equal(overview.current?.id, ladder[knows + 1]);
    assert.equal(overview.skills.filter((s) => s.placed).length, knows + 1);
    assert.ok(overview.placement);
  });

  test("writing without AI: free checks mark it and it's saved", async () => {
    const key = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    // Place the learner just before the sentence-writing skill.
    const ladder = (await getTrackOverview(learner, "literacy")).skills.map((s) => s.id);
    const writeIdx = ladder.indexOf("l13-write-sentence");
    const { savePlacement } = await import("@/lib/tutor/service");
    await savePlacement(learner, "literacy", writeIdx, 10, 9);
    const served = await nextPracticeItem(learner, "literacy", new Date(), () => 0.9);
    assert.equal(served.item.kind, "write");
    const tooShort = await submitWriting(learner, served.token, "i like rice");
    assert.ok(tooShort.ok && !tooShort.passed);
    if (tooShort.ok) assert.ok(tooShort.tips.length >= 2);
    await new Promise((r) => setTimeout(r, 2));
    const served2 = await nextPracticeItem(learner, "literacy", new Date(), () => 0.9);
    const good = await submitWriting(learner, served2.token, "My favourite food is jollof rice with chicken.");
    assert.ok(good.ok && good.passed && !good.aiChecked);
    assert.equal(await prisma.tutorWriting.count({ where: { userId: learner } }), 2);
    if (key) process.env.ANTHROPIC_API_KEY = key;
  });
});
