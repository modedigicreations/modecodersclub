import type { TutorItem } from "./types";

/** Lower-case, trim, collapse spaces, drop a final full stop/question mark. */
export function normaliseText(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.?!]+$/, "")
    .trim()
    .toLowerCase();
}

/** Parse "12", "1,200", "₦500", "500 naira", "0.5", "1/2", "-3". Returns null if not a number. */
export function parseNumber(value: string): number | null {
  const s = value.trim().replace(/[₦,\s]/g, "").replace(/^naira|naira$/gi, "");
  if (/^-?\d+\/\d+$/.test(s)) {
    const [n, d] = s.split("/").map(Number);
    return d ? n! / d : null;
  }
  if (!/^-?\d*\.?\d+$/.test(s)) return null;
  return Number(s);
}

/** Whether a learner's response is right. Choice and order answers must match exactly (after tidying). */
export function isCorrect(item: TutorItem, response: string): boolean {
  if (item.kind === "write") return false; // graded separately (AI / checks)
  const accepted = [item.answer, ...(item.accept ?? [])];
  if (item.kind === "input" && item.inputMode === "numeric") {
    const got = parseNumber(response);
    return got !== null && accepted.some((a) => {
      const want = parseNumber(a);
      return want !== null && Math.abs(got - want) < 1e-9;
    });
  }
  if (item.kind === "choice") {
    // Choices are tapped, so they match exactly; numbers like "1/2" vs "2/4" are distinct options.
    return accepted.includes(response);
  }
  return accepted.some((a) => normaliseText(a) === normaliseText(response));
}

export type WritingCheck = {
  words: number;
  capitalStart: boolean;
  endsWithStop: boolean;
  meetsLength: boolean;
  tips: string[];
};

/** Simple, free checks used when AI feedback isn't available (and as a minimum bar). */
export function checkWriting(text: string, minWords: number): WritingCheck {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const capitalStart = /^[A-Z]/.test(trimmed);
  const endsWithStop = /[.!?]["')\]]?$/.test(trimmed);
  const meetsLength = words >= minWords;
  const tips: string[] = [];
  if (!meetsLength) tips.push(`Write at least ${minWords} words (you wrote ${words}).`);
  if (!capitalStart) tips.push("Start with a capital letter.");
  if (!endsWithStop) tips.push("End with a full stop, question mark or exclamation mark.");
  if (/\bi\b/.test(trimmed)) tips.push('When you mean yourself, write a capital "I".');
  return { words, capitalStart, endsWithStop, meetsLength, tips };
}
