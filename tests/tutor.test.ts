import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SKILLS, buildItem, toPublic, trackSkills } from "@/lib/tutor/skills";
import { checkWriting, isCorrect, parseNumber } from "@/lib/tutor/grading";
import { BLANK_ITEMS, PASSAGES, PICTURE_WORDS, RHYME_FAMILIES } from "@/lib/tutor/literacy-content";

const SEEDS = Array.from({ length: 400 }, (_, i) => (i * 2654435761) >>> 0);

/** Independent check of "a op b = ?" visuals, so a wrong generator can't grade itself. */
function evaluate(visual: string): number | null {
  const m = /^(\d+(?:\.\d+)?) ([+−×÷]) (\d+(?:\.\d+)?) = \?$/.exec(visual);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[3]);
  return { "+": a + b, "−": a - b, "×": a * b, "÷": a / b }[m[2] as "+" | "−" | "×" | "÷"];
}

describe("tutor skill ladder", () => {
  test("ids are unique and both tracks run from level 1 upward", () => {
    assert.equal(new Set(SKILLS.map((s) => s.id)).size, SKILLS.length);
    for (const track of ["literacy", "numeracy"] as const) {
      const levels = trackSkills(track).map((s) => s.level);
      assert.equal(levels[0], 1);
      assert.deepEqual(levels, [...levels].sort((a, b) => a - b), `${track} ladder is in level order`);
      assert.ok(levels.at(-1)! >= 5, `${track} reaches upper primary`);
    }
  });

  for (const skill of SKILLS) {
    test(`${skill.id}: 400 generated questions are well-formed and grade correctly`, () => {
      for (const seed of SEEDS) {
        const item = buildItem(skill.id, seed)!;
        const again = buildItem(skill.id, seed)!;
        assert.deepEqual(item, again, "same seed, same question");
        assert.ok(item.prompt.length > 3, "has a prompt");
        assert.ok(item.explain.length > 3, "has an explanation");
        const pub = toPublic(item) as Record<string, unknown>;
        assert.ok(!("answer" in pub) && !("explain" in pub) && !("accept" in pub), "answer never sent to the browser");

        if (item.kind === "choice") {
          const choices = item.choices!;
          assert.ok(choices.length >= 2 && choices.length <= 4, `${choices.length} choices`);
          assert.equal(new Set(choices).size, choices.length, `unique choices: ${choices}`);
          assert.equal(choices.filter((c) => c === item.answer).length, 1, `answer listed once: ${item.answer} in ${choices}`);
          assert.ok(isCorrect(item, item.answer));
          for (const c of choices) if (c !== item.answer) assert.ok(!isCorrect(item, c), `wrong choice marked right: ${c}`);
          if (/^\d+\/\d+$/.test(item.answer)) {
            const value = parseNumber(item.answer)!;
            for (const c of choices) if (c !== item.answer) assert.notEqual(parseNumber(c), value, `equivalent fraction offered as wrong: ${c}`);
          }
        } else if (item.kind === "input") {
          assert.ok(item.answer.length > 0);
          assert.ok(isCorrect(item, item.answer));
          if (item.inputMode === "numeric") {
            const n = parseNumber(item.answer);
            assert.ok(n !== null && Number.isFinite(n) && n >= 0, `numeric answer ${item.answer}`);
            const check = item.visual ? evaluate(item.visual) : null;
            if (check !== null) assert.ok(Math.abs(check - n!) < 1e-9, `${item.visual} -> ${item.answer}`);
            assert.ok(!isCorrect(item, String(n! + 1)), "an off-by-one answer is wrong");
          }
        } else if (item.kind === "order") {
          const tiles = item.tiles!;
          assert.deepEqual([...tiles].sort(), item.answer.split(" ").sort(), "tiles are exactly the sentence's words");
          assert.notEqual(tiles.join(" "), item.answer, "tiles start shuffled");
          assert.ok(isCorrect(item, item.answer + "."), "a final full stop is fine");
          assert.ok(isCorrect(item, item.answer.toLowerCase()), "capitals in tiles don't matter");
        } else {
          assert.equal(item.kind, "write");
          assert.ok((item.minWords ?? 0) > 0);
        }
      }
    });
  }
});

describe("tutor grading", () => {
  test("numbers in any reasonable form", () => {
    assert.equal(parseNumber("1,200"), 1200);
    assert.equal(parseNumber("₦500"), 500);
    assert.equal(parseNumber("500 naira"), 500);
    assert.equal(parseNumber(" 7 "), 7);
    assert.equal(parseNumber("0.5"), 0.5);
    assert.equal(parseNumber("1/2"), 0.5);
    assert.equal(parseNumber("seven"), null);
    assert.equal(parseNumber(""), null);
    const item = buildItem("n15-decimals", 1)!;
    if (item.kind === "input") assert.ok(isCorrect(item, item.answer.replace(/\.0$/, "")));
  });

  test("spelling is case-insensitive but exact", () => {
    const item = { kind: "input" as const, inputMode: "text" as const, prompt: "p", answer: "school", explain: "e" };
    assert.ok(isCorrect(item, "School"));
    assert.ok(isCorrect(item, " school "));
    assert.ok(!isCorrect(item, "skool"));
  });

  test("simple writing checks", () => {
    const good = checkWriting("I like jollof rice with fried plantain.", 5);
    assert.deepEqual([good.meetsLength, good.capitalStart, good.endsWithStop, good.tips.length], [true, true, true, 0]);
    const poor = checkWriting("i like rice", 5);
    assert.equal(poor.meetsLength, false);
    assert.equal(poor.capitalStart, false);
    assert.equal(poor.endsWithStop, false);
    assert.ok(poor.tips.some((t) => t.includes('capital "I"')));
  });
});

describe("tutor content banks", () => {
  test("passages, blanks and word lists are consistent", () => {
    for (const p of PASSAGES) {
      for (const q of p.questions) {
        assert.equal(q.options.filter((o) => o === q.answer).length, 1, `${p.title}: ${q.q}`);
        assert.equal(new Set(q.options).size, q.options.length);
      }
    }
    for (const b of BLANK_ITEMS) {
      assert.ok(b.sentence.includes("___"));
      assert.equal(b.options.filter((o) => o === b.answer).length, 1);
    }
    assert.equal(new Set(PICTURE_WORDS.map((w) => w.word)).size, PICTURE_WORDS.length);
    const all = RHYME_FAMILIES.flat();
    assert.equal(new Set(all).size, all.length, "a word belongs to one rhyme family");
  });
});

import { EMPTY_PROGRESS, PLACEMENT_MAX_QUESTIONS, REVIEW_INTERVALS_DAYS, applyAnswer, hasMastered, masteryPercent, startPlacement, stepPlacement } from "@/lib/tutor/mastery";

describe("tutor mastery and review", () => {
  const DAY = 86_400_000;
  test("8 of the last 10 masters a skill; writing needs 3 of the last 4", () => {
    assert.equal(hasMastered("1111111", "input"), false, "7 right is not enough");
    assert.equal(hasMastered("11111111", "input"), true);
    assert.equal(hasMastered("1101111011", "choice"), true, "8 of 10 with mistakes");
    assert.equal(hasMastered("0101010111", "choice"), false);
    assert.equal(hasMastered("111", "write"), true);
    assert.equal(hasMastered("1010", "write"), false);
    assert.equal(masteryPercent("1111", "input", false), 50);
    assert.equal(masteryPercent("", "input", true), 100);
  });

  test("mastery schedules review; reviews space out and a miss brings it back to tomorrow", () => {
    const t0 = new Date("2026-11-18T09:00:00Z");
    let s = { ...EMPTY_PROGRESS };
    for (let i = 0; i < 7; i++) s = applyAnswer(s, true, "input", t0);
    assert.equal(s.masteredAt, null);
    const m = applyAnswer(s, true, "input", t0);
    assert.equal(m.justMastered, true);
    assert.equal(m.reviewDueAt!.getTime(), t0.getTime() + REVIEW_INTERVALS_DAYS[0] * DAY);

    const notDue = applyAnswer(m, true, "input", new Date(t0.getTime() + 3600_000));
    assert.equal(notDue.reviewStep, 0, "extra practice before it's due doesn't skip ahead");
    const r1 = applyAnswer(m, true, "input", new Date(t0.getTime() + 2 * DAY));
    assert.equal(r1.reviewStep, 1);
    assert.equal(r1.reviewDueAt!.getTime(), t0.getTime() + 2 * DAY + REVIEW_INTERVALS_DAYS[1] * DAY);
    const miss = applyAnswer(r1, false, "input", new Date(t0.getTime() + 10 * DAY));
    assert.equal(miss.reviewStep, 0);
    assert.ok(miss.masteredAt, "a miss never removes mastery");
    assert.equal(miss.reviewDueAt!.getTime(), t0.getTime() + 11 * DAY);
  });

  test("placement finds the right starting skill for every ability level, from any starting guess", () => {
    for (const n of [15, 18]) {
      for (let knows = -1; knows < n; knows++) {
        for (const start of [0, 3, 7, n - 1]) {
          let state = startPlacement(n, start);
          let result: ReturnType<typeof stepPlacement> | null = null;
          for (let guard = 0; guard < 40; guard++) {
            const correct = state.idx <= knows;
            result = stepPlacement(state, correct);
            state = result.state;
            if (result.done) break;
          }
          assert.ok(result?.done, "placement finishes");
          assert.ok(state.asked <= PLACEMENT_MAX_QUESTIONS, `${state.asked} questions`);
          if (result!.done) assert.equal(result.startIndex, knows + 1, `n=${n} knows up to ${knows}, start ${start}`);
        }
      }
    }
  });
});

import { safeSsoDestination } from "@/lib/enterprise-sso-plugin";

describe("school launch destination", () => {
  test("only the dashboard or the tutor; never another site", () => {
    assert.equal(safeSsoDestination("/tutor"), "/tutor");
    assert.equal(safeSsoDestination("/tutor/numeracy"), "/tutor/numeracy");
    assert.equal(safeSsoDestination("/dashboard"), "/dashboard");
    for (const bad of ["//evil.com", "https://evil.com", "/tutor/../admin", "/admin", "/tutor?x=1", "javascript:alert(1)", undefined, 42]) {
      assert.equal(safeSsoDestination(bad), "/dashboard", String(bad));
    }
  });
});

import { safeNext } from "@/lib/safe-next";

describe("sign-in return path", () => {
  test("returns to the tutor or dashboard only", () => {
    assert.equal(safeNext("/tutor"), "/tutor");
    assert.equal(safeNext("/tutor/literacy/placement"), "/tutor/literacy/placement");
    assert.equal(safeNext("https://evil.com", ""), "");
    assert.equal(safeNext("//evil.com", ""), "");
    assert.equal(safeNext(undefined, ""), "");
  });
});
