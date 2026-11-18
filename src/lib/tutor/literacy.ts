import {
  BLANK_ITEMS,
  CVC_WORDS,
  GRAMMAR_SENTENCES,
  ORDER_SENTENCES,
  PASSAGES,
  PICTURE_WORDS,
  PUNCTUATION_SENTENCES,
  RHYME_FAMILIES,
  SIGHT_WORDS,
  SPELLING_WORDS,
  VOCAB,
  WRITING_PROMPTS,
} from "./literacy-content";
import { choiceSet } from "./rng";
import type { Rng, Skill } from "./types";

// Reading and writing ladder: letters -> phonics -> sight words -> spelling ->
// sentences -> grammar -> comprehension -> writing.

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
const VOWELS = ["a", "e", "i", "o", "u"];

/** Misspellings of a CVC word by changing its vowel (all different from the word). */
function vowelSwaps(word: string): string[] {
  return VOWELS.filter((v) => v !== word[1]).map((v) => word[0] + v + word.slice(2));
}

/** Break a correct sentence in common ways: missing capital, missing stop, wrong capitals. */
function punctuationMistakes(sentence: string): string[] {
  const end = sentence.slice(-1);
  const body = sentence.slice(0, -1);
  const lowerFirst = sentence[0]!.toLowerCase() + sentence.slice(1);
  const noEnd = body;
  const wrongEnd = body + (end === "?" ? "." : "?");
  const shouty = body
    .split(" ")
    .map((w, i) => (i === 1 ? w.toLowerCase() === w ? w[0]!.toUpperCase() + w.slice(1) : w.toLowerCase() : w))
    .join(" ") + end;
  return [lowerFirst, noEnd, wrongEnd, shouty].filter((s) => s !== sentence);
}

export const LITERACY_SKILLS: Skill[] = [
  {
    id: "l01-letters",
    track: "literacy",
    level: 1,
    title: "Big and small letters",
    description: "Match capital letters with small letters.",
    generate: (rng) => {
      const letter = rng.pick(LETTERS);
      return {
        kind: "choice",
        prompt: `Find the small letter for ${letter.toUpperCase()}.`,
        speak: `Find the small letter for ${letter.toUpperCase()}.`,
        visual: letter.toUpperCase(),
        choices: choiceSet(rng, letter, rng.shuffle(LETTERS.filter((l) => l !== letter))),
        answer: letter,
        explain: `Capital ${letter.toUpperCase()} and small ${letter} are the same letter.`,
      };
    },
  },
  {
    id: "l02-sounds",
    track: "literacy",
    level: 1,
    title: "First sounds",
    description: "Hear the first sound of a word.",
    generate: (rng) => {
      const target = rng.pick(PICTURE_WORDS);
      const first = target.word[0]!;
      const others = rng.shuffle(PICTURE_WORDS.filter((w) => w.word[0] !== first)).slice(0, 3);
      const label = (w: { word: string; emoji: string }) => `${w.emoji} ${w.word}`;
      return {
        kind: "choice",
        prompt: `Which word starts with the letter ${first.toUpperCase()}?`,
        speak: `Which word starts with the sound of ${first}?`,
        visual: first.toUpperCase() + first,
        choices: rng.shuffle([label(target), ...others.map(label)]),
        answer: label(target),
        explain: `"${target.word}" starts with ${first}.`,
      };
    },
  },
  {
    id: "l03-cvc",
    track: "literacy",
    level: 1,
    title: "Reading short words",
    description: "Read three-letter words like cat, dog and sun.",
    generate: (rng) => {
      const t = rng.pick(CVC_WORDS);
      return {
        kind: "choice",
        prompt: "Which word matches the picture?",
        speak: "Which word matches the picture?",
        visual: t.emoji,
        choices: choiceSet(rng, t.word, vowelSwaps(t.word)),
        answer: t.word,
        explain: `Sound it out: ${t.word.split("").join("-")} makes "${t.word}".`,
      };
    },
  },
  {
    id: "l04-sight",
    track: "literacy",
    level: 1,
    title: "Sight words",
    description: "Recognise common words instantly.",
    generate: (rng) => {
      const word = rng.pick(SIGHT_WORDS);
      return {
        kind: "choice",
        prompt: "Listen, then tap the word you hear.",
        speak: word,
        choices: choiceSet(rng, word, SIGHT_WORDS.filter((w) => w.length === word.length || Math.abs(w.length - word.length) === 1)),
        answer: word,
        explain: `The word was "${word}".`,
      };
    },
  },
  {
    id: "l05-rhyme",
    track: "literacy",
    level: 2,
    title: "Rhyming words",
    description: "Find words that sound the same at the end.",
    generate: (rng) => {
      const fi = rng.int(0, RHYME_FAMILIES.length - 1);
      const family = RHYME_FAMILIES[fi]!;
      const [word, rhyme] = rng.shuffle(family);
      const others = rng.shuffle(RHYME_FAMILIES.filter((_, i) => i !== fi).flat()).slice(0, 3);
      return {
        kind: "choice",
        prompt: `Which word rhymes with "${word}"?`,
        speak: `Which word rhymes with ${word}?`,
        choices: rng.shuffle([rhyme!, ...others]),
        answer: rhyme!,
        explain: `"${word}" and "${rhyme}" end with the same sound.`,
      };
    },
  },
  {
    id: "l06-spell",
    track: "literacy",
    level: 2,
    title: "Spelling",
    description: "Listen to a word and spell it.",
    generate: (rng) => {
      const pool = rng.next() < 0.6 ? SPELLING_WORDS[1] : SPELLING_WORDS[2];
      const word = rng.pick(pool);
      const pic = PICTURE_WORDS.find((p) => p.word === word);
      return {
        kind: "input",
        inputMode: "text",
        prompt: "Listen, then type the word.",
        speak: word,
        visual: pic?.emoji,
        answer: word,
        explain: `It is spelt ${word.split("").join("-")}.`,
      };
    },
  },
  {
    id: "l07-order",
    track: "literacy",
    level: 2,
    title: "Building sentences",
    description: "Put words in the right order to make a sentence.",
    generate: (rng) => {
      const sentence = rng.pick(ORDER_SENTENCES);
      const words = sentence.split(" ");
      let tiles = rng.shuffle(words);
      if (tiles.join(" ") === sentence) tiles = [...words.slice(1), words[0]!];
      return {
        kind: "order",
        prompt: "Tap the words in order to make a sentence.",
        tiles,
        answer: sentence,
        explain: `The sentence is: "${sentence}."`,
      };
    },
  },
  {
    id: "l08-punctuation",
    track: "literacy",
    level: 3,
    title: "Capitals and full stops",
    description: "Start sentences with a capital and end them with a full stop or question mark.",
    generate: (rng) => {
      const sentence = rng.pick(PUNCTUATION_SENTENCES);
      return {
        kind: "choice",
        prompt: "Which sentence is written correctly?",
        choices: choiceSet(rng, sentence, punctuationMistakes(sentence)),
        answer: sentence,
        explain: sentence.endsWith("?")
          ? "A question starts with a capital letter and ends with a question mark."
          : "A sentence starts with a capital letter, names have capitals, and it ends with a full stop.",
      };
    },
  },
  {
    id: "l09-grammar",
    track: "literacy",
    level: 3,
    title: "Nouns, verbs and adjectives",
    description: "Name things (nouns), actions (verbs) and describing words (adjectives).",
    generate: (rng) => {
      const g = rng.pick(GRAMMAR_SENTENCES);
      const kind = rng.pick(["noun", "verb", "adjective"] as const);
      const answer = g[kind];
      const label = { noun: "a naming word (noun)", verb: "an action word (verb)", adjective: "a describing word (adjective)" }[kind];
      return {
        kind: "choice",
        prompt: `In "${g.sentence}", which word is ${label}?`,
        // Only the sentence's labelled noun, verb and adjective: exactly one fits.
        choices: rng.shuffle([g.noun, g.verb, g.adjective]),
        answer,
        explain: `"${answer}" is ${label}.`,
      };
    },
  },
  {
    id: "l10-tense",
    track: "literacy",
    level: 3,
    title: "Tenses and plurals",
    description: "Choose the right form of a word.",
    generate: (rng) => {
      const b = rng.pick(BLANK_ITEMS);
      return {
        kind: "choice",
        prompt: `Choose the word that fits: ${b.sentence}`,
        speak: b.sentence.replace("___", "blank"),
        choices: rng.shuffle(b.options),
        answer: b.answer,
        explain: b.why,
      };
    },
  },
  {
    id: "l11-reading",
    track: "literacy",
    level: 4,
    title: "Reading for facts",
    description: "Read a short passage and answer questions about it.",
    generate: (rng) => {
      const p = rng.pick(PASSAGES.filter((x) => x.level === 1));
      const q = rng.pick(p.questions);
      return {
        kind: "choice",
        prompt: q.q,
        passage: `${p.title}\n\n${p.text}`,
        speak: p.text,
        choices: rng.shuffle(q.options),
        answer: q.answer,
        explain: `Look back at the passage: the answer is "${q.answer}".`,
      };
    },
  },
  {
    id: "l12-vocab",
    track: "literacy",
    level: 4,
    title: "Word meanings",
    description: "Find words with the same or opposite meaning.",
    generate: (rng) => {
      const v = rng.pick(VOCAB);
      const same = rng.next() < 0.5;
      const answer = same ? v.same : v.opposite;
      const distractors = [...v.others, same ? v.opposite : v.same];
      return {
        kind: "choice",
        prompt: same ? `Which word means the same as "${v.word}"?` : `Which word means the opposite of "${v.word}"?`,
        choices: choiceSet(rng, answer, distractors),
        answer,
        explain: same ? `"${v.word}" and "${v.same}" mean almost the same thing.` : `"${v.opposite}" is the opposite of "${v.word}".`,
      };
    },
  },
  {
    id: "l13-write-sentence",
    track: "literacy",
    level: 4,
    title: "Writing sentences",
    description: "Write a clear sentence with a capital letter and full stop.",
    generate: (rng) => {
      const w = rng.pick(WRITING_PROMPTS.filter((x) => x.level === 1));
      return {
        kind: "write",
        prompt: w.prompt,
        speak: w.prompt,
        minWords: 5,
        answer: "",
        explain: "A good sentence starts with a capital letter, makes sense on its own, and ends with a full stop.",
      };
    },
  },
  {
    id: "l14-inference",
    track: "literacy",
    level: 5,
    title: "Reading between the lines",
    description: "Work out feelings and reasons that a story doesn't say directly.",
    generate: (rng) => {
      const p = rng.pick(PASSAGES.filter((x) => x.level === 2));
      const q = rng.pick(p.questions);
      return {
        kind: "choice",
        prompt: q.q,
        passage: `${p.title}\n\n${p.text}`,
        speak: p.text,
        choices: rng.shuffle(q.options),
        answer: q.answer,
        explain: `Use clues in the story: the best answer is "${q.answer}".`,
      };
    },
  },
  {
    id: "l15-write-paragraph",
    track: "literacy",
    level: 6,
    title: "Writing paragraphs",
    description: "Write a short paragraph that stays on topic and is easy to follow.",
    generate: (rng) => {
      const w = rng.pick(WRITING_PROMPTS.filter((x) => x.level === 2));
      return {
        kind: "write",
        prompt: w.prompt,
        speak: w.prompt,
        minWords: 40,
        answer: "",
        explain: "A good paragraph has an opening sentence, a few sentences with details, and a closing sentence.",
      };
    },
  },
];

export type { Rng };
