// Shared types for the reading, writing and maths tutor.

export type Track = "literacy" | "numeracy";

export type ItemKind = "choice" | "input" | "order" | "write";

/** One practice question. `answer`/`accept`/`explain` never leave the server. */
export type TutorItem = {
  kind: ItemKind;
  /** The question as text (always shown). */
  prompt: string;
  /** Read aloud by the browser's voice when present (and on "Listen"). */
  speak?: string;
  /** Big visual: emoji objects, a number sentence, a word. */
  visual?: string;
  /** Reading passage for comprehension questions. */
  passage?: string;
  /** For "choice": the options to tap. */
  choices?: string[];
  /** For "order": shuffled word tiles to arrange. */
  tiles?: string[];
  /** For "input": keyboard hint. */
  inputMode?: "numeric" | "text";
  /** For "write": minimum words expected. */
  minWords?: number;
  /** Canonical correct answer. */
  answer: string;
  /** Other accepted answers (e.g. "0.5" for "1/2"). */
  accept?: string[];
  /** Short worked explanation shown after answering. */
  explain: string;
};

/** What the browser receives: the item without its answer. */
export type PublicItem = Omit<TutorItem, "answer" | "accept" | "explain">;

export type Skill = {
  id: string;
  track: Track;
  /** 1 = early primary ... 6 = upper primary. */
  level: number;
  title: string;
  /** Friendly one-liner for learners, parents and teachers. */
  description: string;
  generate: (rng: Rng) => TutorItem;
};

export type Rng = {
  /** Float in [0, 1). */
  next: () => number;
  /** Integer in [min, max] inclusive. */
  int: (min: number, max: number) => number;
  pick: <T>(list: readonly T[]) => T;
  shuffle: <T>(list: readonly T[]) => T[];
};
