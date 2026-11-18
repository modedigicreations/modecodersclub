import type { Rng } from "./types";

/** Deterministic PRNG (mulberry32): the same seed always rebuilds the same question. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)]!;
  const shuffle = <T,>(list: readonly T[]): T[] => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  };
  return { next, int, pick, shuffle };
}

/** Options for a multiple-choice question: the answer plus distinct distractors, shuffled. */
export function choiceSet(rng: Rng, answer: string, distractors: readonly string[], count = 4): string[] {
  const unique = [...new Set(distractors.filter((d) => d !== answer))];
  return rng.shuffle([answer, ...rng.shuffle(unique).slice(0, count - 1)]);
}

/** Numeric distractors near the answer (never negative, never equal to the answer). */
export function nearNumbers(rng: Rng, answer: number, spread = 3, count = 3): string[] {
  const out = new Set<number>();
  let guard = 0;
  while (out.size < count && guard++ < 100) {
    const d = answer + rng.int(-spread, spread);
    if (d !== answer && d >= 0) out.add(d);
  }
  let k = 1;
  while (out.size < count) {
    if (answer + k !== answer) out.add(answer + k);
    k++;
  }
  return [...out].map(String);
}
