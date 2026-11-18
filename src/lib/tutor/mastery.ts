// Pure learning rules: mastery, spaced review and adaptive placement.
// No database here, so every rule is unit-tested.

import type { ItemKind } from "./types";

const DAY = 24 * 60 * 60 * 1000;

/** Review gaps after mastering a skill, in days. Each successful review moves one step on. */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60] as const;

/** Practice skills: 8 of the last 10 right. Writing tasks: 3 of the last 4 good pieces. */
export function masteryRule(kind: ItemKind): { window: number; need: number } {
  return kind === "write" ? { window: 4, need: 3 } : { window: 10, need: 8 };
}

export type ProgressState = {
  attempts: number;
  correct: number;
  recent: string;
  masteredAt: Date | null;
  reviewStep: number;
  reviewDueAt: Date | null;
};

export const EMPTY_PROGRESS: ProgressState = {
  attempts: 0,
  correct: 0,
  recent: "",
  masteredAt: null,
  reviewStep: 0,
  reviewDueAt: null,
};

export function hasMastered(recent: string, kind: ItemKind): boolean {
  const { window, need } = masteryRule(kind);
  const last = recent.slice(-window);
  return [...last].filter((c) => c === "1").length >= need;
}

/**
 * Applies one answer. Unmastered skills move towards mastery; mastered skills
 * are on spaced review: right pushes the next review further out, wrong brings
 * it back to tomorrow. A mastered skill is never taken away.
 */
export function applyAnswer(
  state: ProgressState,
  correct: boolean,
  kind: ItemKind,
  now = new Date(),
): ProgressState & { justMastered: boolean } {
  const recent = (state.recent + (correct ? "1" : "0")).slice(-10);
  const next = {
    attempts: state.attempts + 1,
    correct: state.correct + (correct ? 1 : 0),
    recent,
    masteredAt: state.masteredAt,
    reviewStep: state.reviewStep,
    reviewDueAt: state.reviewDueAt,
    justMastered: false,
  };
  if (!state.masteredAt) {
    if (hasMastered(recent, kind)) {
      next.masteredAt = now;
      next.reviewStep = 0;
      next.reviewDueAt = new Date(now.getTime() + REVIEW_INTERVALS_DAYS[0] * DAY);
      next.justMastered = true;
    }
    return next;
  }
  // Only a review that was due moves the schedule on (extra practice doesn't skip ahead).
  const wasDue = !state.reviewDueAt || state.reviewDueAt <= now;
  if (!correct) {
    next.reviewStep = Math.max(0, state.reviewStep - 1);
    next.reviewDueAt = new Date(now.getTime() + DAY);
  } else if (wasDue) {
    next.reviewStep = Math.min(state.reviewStep + 1, REVIEW_INTERVALS_DAYS.length - 1);
    next.reviewDueAt = new Date(now.getTime() + REVIEW_INTERVALS_DAYS[next.reviewStep]! * DAY);
  }
  return next;
}

/** 0-100: how close an unmastered skill is to mastery (for progress bars). */
export function masteryPercent(recent: string, kind: ItemKind, mastered: boolean): number {
  if (mastered) return 100;
  const { window, need } = masteryRule(kind);
  const got = [...recent.slice(-window)].filter((c) => c === "1").length;
  return Math.round((Math.min(got, need) / need) * 100);
}

// ── Placement ───────────────────────────────────────────────────────────────
// Find the first skill a learner hasn't got yet, in ~10 questions:
// gallop up from a starting guess while they pass, then binary-search.

export type PlacementState = {
  /** Highest skill index passed so far (-1 = none). */
  lo: number;
  /** Lowest skill index failed so far (ladder length = none). */
  hi: number;
  /** Skill index being tested now. */
  idx: number;
  /** Step size while galloping upward (0 once a failure has been seen). */
  step: number;
  /** Answers on the current skill: "1"/"0". */
  current: string;
  asked: number;
  right: number;
};

export const PLACEMENT_MAX_QUESTIONS = 14;
const PER_SKILL = 2;

export function startPlacement(ladderLength: number, startIndex: number): PlacementState {
  const idx = Math.max(0, Math.min(ladderLength - 1, startIndex));
  return { lo: -1, hi: ladderLength, idx, step: 2, current: "", asked: 0, right: 0 };
}

/** Next state after an answer; `done` with `startIndex` = first skill to learn. */
export function stepPlacement(
  s: PlacementState,
  correct: boolean,
): { state: PlacementState; done: false } | { state: PlacementState; done: true; startIndex: number } {
  const state: PlacementState = {
    ...s,
    current: s.current + (correct ? "1" : "0"),
    asked: s.asked + 1,
    right: s.right + (correct ? 1 : 0),
  };
  const failedSkill = state.current.includes("0");
  const finishedSkill = failedSkill || state.current.length >= PER_SKILL;
  if (finishedSkill) {
    if (failedSkill) {
      state.hi = Math.min(state.hi, state.idx);
      state.step = 0;
    } else {
      state.lo = Math.max(state.lo, state.idx);
    }
    state.current = "";
    if (state.step > 0 && !failedSkill) {
      state.idx = Math.min(state.hi - 1, state.idx + state.step);
      state.step *= 2;
      if (state.idx <= state.lo) state.idx = state.lo + 1;
    } else {
      state.idx = Math.floor((state.lo + state.hi) / 2);
    }
  }
  const settled = state.hi - state.lo <= 1 || state.idx <= state.lo || state.idx >= state.hi;
  if ((finishedSkill && settled) || state.asked >= PLACEMENT_MAX_QUESTIONS) {
    return { state, done: true, startIndex: Math.min(state.lo + 1, state.hi) };
  }
  return { state, done: false };
}

/** When placement-mastered skills come up for review: spread out so they don't all land at once. */
export function placedReviewDue(index: number, now = new Date()): Date {
  return new Date(now.getTime() + (1 + (index % 5)) * DAY);
}
