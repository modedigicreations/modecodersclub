import { choiceSet, nearNumbers } from "./rng";
import type { Rng, Skill, TutorItem } from "./types";

// Maths ladder: counting -> four operations -> fractions, decimals, percentages.
// Every question is generated from a seed, so practice never runs out and the
// answer is always computed, never typed by hand.

const OBJECTS = ["🍊", "🥭", "⚽", "🐔", "🌽", "🍌", "⭐", "🚗", "🐟", "🍎"] as const;
const NAMES = ["Ada", "Tunde", "Chidi", "Amina", "Ngozi", "Musa", "Bisi", "Emeka", "Zainab", "Ife"] as const;

const fmt = (n: number) => n.toLocaleString("en-NG");
const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

function numeric(prompt: string, visual: string, answer: number, explain: string, speak?: string): TutorItem {
  return { kind: "input", inputMode: "numeric", prompt, visual, answer: String(answer), explain, speak: speak ?? prompt };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export const NUMERACY_SKILLS: Skill[] = [
  {
    id: "n01-count",
    track: "numeracy",
    level: 1,
    title: "Counting to 10",
    description: "Count objects up to 10.",
    generate: (rng) => {
      const n = rng.int(1, 10);
      const obj = rng.pick(OBJECTS);
      return {
        kind: "choice",
        prompt: "How many are there?",
        speak: "How many are there?",
        visual: obj.repeat(n),
        choices: choiceSet(rng, String(n), nearNumbers(rng, n, 2)),
        answer: String(n),
        explain: `Point and count each one: there are ${n}.`,
      };
    },
  },
  {
    id: "n02-compare",
    track: "numeracy",
    level: 1,
    title: "Bigger and smaller",
    description: "Compare numbers up to 100.",
    generate: (rng) => {
      const a = rng.int(1, 99);
      let b = rng.int(1, 99);
      if (b === a) b = a === 99 ? a - 1 : a + 1;
      const bigger = rng.next() < 0.5;
      const answer = String(bigger ? Math.max(a, b) : Math.min(a, b));
      return {
        kind: "choice",
        prompt: bigger ? "Which number is bigger?" : "Which number is smaller?",
        choices: [String(a), String(b)],
        answer,
        explain: `Look at the tens first, then the ones. ${Math.max(a, b)} is bigger than ${Math.min(a, b)}.`,
      };
    },
  },
  {
    id: "n03-add10",
    track: "numeracy",
    level: 1,
    title: "Adding within 10",
    description: "Add two numbers that make 10 or less.",
    generate: (rng) => {
      const a = rng.int(0, 9);
      const b = rng.int(0, 10 - a);
      return numeric(`What is ${a} + ${b}?`, `${a} + ${b} = ?`, a + b, `Start at ${a} and count on ${b}: ${a + b}.`);
    },
  },
  {
    id: "n04-sub10",
    track: "numeracy",
    level: 1,
    title: "Taking away within 10",
    description: "Subtract from numbers up to 10.",
    generate: (rng) => {
      const a = rng.int(1, 10);
      const b = rng.int(0, a);
      return numeric(`What is ${a} − ${b}?`, `${a} − ${b} = ?`, a - b, `Start at ${a} and count back ${b}: ${a - b}.`, `What is ${a} take away ${b}?`);
    },
  },
  {
    id: "n05-addsub20",
    track: "numeracy",
    level: 2,
    title: "Adding and taking away within 20",
    description: "Add and subtract with answers up to 20.",
    generate: (rng) => {
      if (rng.next() < 0.5) {
        const a = rng.int(2, 18);
        const b = rng.int(1, 20 - a);
        return numeric(`What is ${a} + ${b}?`, `${a} + ${b} = ?`, a + b, `Make 10 first: ${a} + ${b} = ${a + b}.`);
      }
      const a = rng.int(10, 20);
      const b = rng.int(1, a);
      return numeric(`What is ${a} − ${b}?`, `${a} − ${b} = ?`, a - b, `Count back ${b} from ${a}: ${a - b}.`, `What is ${a} take away ${b}?`);
    },
  },
  {
    id: "n06-placevalue",
    track: "numeracy",
    level: 2,
    title: "Tens and ones",
    description: "Understand tens and ones in 2-digit numbers.",
    generate: (rng) => {
      const tens = rng.int(1, 9);
      const ones = rng.int(0, 9);
      const n = tens * 10 + ones;
      if (rng.next() < 0.5) {
        return numeric(`How many tens are in ${n}?`, String(n), tens, `${n} is ${tens} tens and ${ones} ones.`);
      }
      return numeric(
        `What number is ${tens} tens and ${ones} ones?`,
        `${"🔟".repeat(tens)} ${"•".repeat(ones)}`,
        n,
        `${tens} tens make ${tens * 10}; add ${ones} ones to get ${n}.`,
      );
    },
  },
  {
    id: "n07-addsub100",
    track: "numeracy",
    level: 2,
    title: "2-digit adding and taking away",
    description: "Add and subtract within 100, with carrying and borrowing.",
    generate: (rng) => {
      if (rng.next() < 0.5) {
        const a = rng.int(11, 79);
        const b = rng.int(11, 99 - a);
        return numeric(`What is ${a} + ${b}?`, `${a} + ${b} = ?`, a + b, `Add the tens (${Math.floor(a / 10) * 10} + ${Math.floor(b / 10) * 10}), then the ones (${a % 10} + ${b % 10}): ${a + b}.`);
      }
      const a = rng.int(30, 99);
      const b = rng.int(11, a - 1);
      return numeric(`What is ${a} − ${b}?`, `${a} − ${b} = ?`, a - b, `Take away the tens, then the ones: ${a} − ${b} = ${a - b}.`, `What is ${a} take away ${b}?`);
    },
  },
  {
    id: "n08-times-easy",
    track: "numeracy",
    level: 3,
    title: "Times tables 2, 3, 4, 5, 10",
    description: "Know the easier times tables by heart.",
    generate: (rng) => {
      const a = rng.pick([2, 3, 4, 5, 10]);
      const b = rng.int(1, 12);
      return numeric(`What is ${a} × ${b}?`, `${a} × ${b} = ?`, a * b, `${b} groups of ${a} make ${a * b}.`, `What is ${a} times ${b}?`);
    },
  },
  {
    id: "n09-times-hard",
    track: "numeracy",
    level: 3,
    title: "Times tables 6 to 12",
    description: "Know all the times tables up to 12 × 12.",
    generate: (rng) => {
      const a = rng.int(6, 12);
      const b = rng.int(2, 12);
      return numeric(`What is ${a} × ${b}?`, `${a} × ${b} = ?`, a * b, `${a} × ${b} = ${a * b}. Tip: ${a} × ${b} is the same as ${b} × ${a}.`, `What is ${a} times ${b}?`);
    },
  },
  {
    id: "n10-division",
    track: "numeracy",
    level: 3,
    title: "Division facts",
    description: "Share equally using the times tables.",
    generate: (rng) => {
      const b = rng.int(2, 12);
      const q = rng.int(1, 12);
      const a = b * q;
      return numeric(`What is ${a} ÷ ${b}?`, `${a} ÷ ${b} = ?`, q, `${b} × ${q} = ${a}, so ${a} ÷ ${b} = ${q}.`, `What is ${a} divided by ${b}?`);
    },
  },
  {
    id: "n11-addsub1000",
    track: "numeracy",
    level: 4,
    title: "3-digit adding and taking away",
    description: "Add and subtract numbers up to 1,000.",
    generate: (rng) => {
      if (rng.next() < 0.5) {
        const a = rng.int(101, 799);
        const b = rng.int(101, 999 - a);
        return numeric(`What is ${a} + ${b}?`, `${a} + ${b} = ?`, a + b, `Line up hundreds, tens and ones, and add from the right: ${a + b}.`);
      }
      const a = rng.int(300, 999);
      const b = rng.int(101, a - 1);
      return numeric(`What is ${a} − ${b}?`, `${a} − ${b} = ?`, a - b, `Line up the digits and subtract from the right, borrowing when needed: ${a - b}.`, `What is ${a} take away ${b}?`);
    },
  },
  {
    id: "n12-mult2x1",
    track: "numeracy",
    level: 4,
    title: "Multiplying 2-digit by 1-digit",
    description: "Multiply numbers like 34 × 6.",
    generate: (rng) => {
      const a = rng.int(12, 99);
      const b = rng.int(2, 9);
      const t = Math.floor(a / 10) * 10;
      return numeric(`What is ${a} × ${b}?`, `${a} × ${b} = ?`, a * b, `Split ${a} into ${t} + ${a - t}: ${t} × ${b} = ${t * b}, ${a - t} × ${b} = ${(a - t) * b}; total ${a * b}.`, `What is ${a} times ${b}?`);
    },
  },
  {
    id: "n13-word",
    track: "numeracy",
    level: 4,
    title: "Word problems",
    description: "Solve everyday problems with +, −, × and ÷.",
    generate: (rng) => {
      const who = rng.pick(NAMES);
      const kind = rng.int(0, 3);
      if (kind === 0) {
        const a = rng.int(5, 60);
        const b = rng.int(5, 40);
        return numeric(`${who} has ${a} oranges and buys ${b} more. How many oranges does ${who} have now?`, "🍊", a + b, `Buying more means adding: ${a} + ${b} = ${a + b}.`);
      }
      if (kind === 1) {
        const price = rng.pick([50, 100, 150, 200, 250, 500]);
        const paid = price * rng.int(2, 4) + rng.pick([0, 50, 100]);
        return numeric(`${who} pays ${naira(paid)} for a book that costs ${naira(price)}. How much change, in naira?`, "📘", paid - price, `Change = money paid − price: ${fmt(paid)} − ${fmt(price)} = ${fmt(paid - price)}.`);
      }
      if (kind === 2) {
        const rows = rng.int(3, 9);
        const each = rng.int(4, 12);
        return numeric(`A classroom has ${rows} rows of desks with ${each} desks in each row. How many desks are there?`, "🪑", rows * each, `Equal rows means multiplying: ${rows} × ${each} = ${rows * each}.`);
      }
      const people = rng.int(2, 9);
      const each = rng.int(2, 12);
      return numeric(`${who} shares ${people * each} sweets equally among ${people} friends. How many sweets does each friend get?`, "🍬", each, `Sharing equally means dividing: ${people * each} ÷ ${people} = ${each}.`);
    },
  },
  {
    id: "n14-fractions",
    track: "numeracy",
    level: 5,
    title: "Fractions",
    description: "Find a fraction of an amount and simplify fractions.",
    generate: (rng) => {
      if (rng.next() < 0.5) {
        const d = rng.pick([2, 3, 4, 5, 10]);
        const n = rng.int(1, d - 1);
        const whole = d * rng.int(2, 12);
        return numeric(`What is ${n}/${d} of ${whole}?`, `${n}/${d} of ${whole}`, (whole / d) * n, `${whole} ÷ ${d} = ${whole / d}, then × ${n} = ${(whole / d) * n}.`, `What is ${n} over ${d} of ${whole}?`);
      }
      const d = rng.pick([2, 3, 4, 5]);
      const n = rng.int(1, d - 1);
      const g = gcd(n, d);
      const sn = n / g;
      const sd = d / g;
      const k = rng.int(2, 5);
      const answer = `${sn}/${sd}`;
      const distract = [`${n * k}/${d * (k + 1)}`, `${sn + 1}/${sd + 1}`, `${sd}/${sn + sd}`, `${n}/${d * k}`, `${sn}/${sd + 1}`];
      return {
        kind: "choice",
        prompt: `Which fraction is the same as ${n * k}/${d * k}?`,
        visual: `${n * k}/${d * k}`,
        choices: choiceSet(rng, answer, distract),
        answer,
        explain: `Divide the top and bottom by ${(n * k) / sn}: ${n * k}/${d * k} = ${answer}.`,
      };
    },
  },
  {
    id: "n15-decimals",
    track: "numeracy",
    level: 5,
    title: "Decimals",
    description: "Add, subtract and compare decimals.",
    generate: (rng) => {
      const a = rng.int(11, 99) / 10;
      const b = rng.int(11, 99) / 10;
      if (rng.next() < 0.6) {
        const sum = Math.round((a + b) * 10) / 10;
        const item = numeric(`What is ${a.toFixed(1)} + ${b.toFixed(1)}?`, `${a.toFixed(1)} + ${b.toFixed(1)} = ?`, sum, `Line up the decimal points: ${a.toFixed(1)} + ${b.toFixed(1)} = ${sum.toFixed(1)}.`);
        return { ...item, answer: sum.toFixed(1), accept: [String(sum)] };
      }
      const x = a === b ? a + 0.1 : a;
      const bigger = Math.max(x, b);
      return {
        kind: "choice",
        prompt: "Which is bigger?",
        choices: [x.toFixed(1), b.toFixed(1)],
        answer: bigger.toFixed(1),
        explain: `Compare the whole numbers first, then the tenths: ${bigger.toFixed(1)} is bigger.`,
      };
    },
  },
  {
    id: "n16-percent",
    track: "numeracy",
    level: 6,
    title: "Percentages",
    description: "Find 10%, 25%, 50% and 75% of amounts.",
    generate: (rng) => {
      const p = rng.pick([10, 25, 50, 75]);
      const base = rng.pick([20, 40, 80, 100, 200, 400, 800, 1000, 2000]);
      const v = (base * p) / 100;
      return numeric(`What is ${p}% of ${naira(base)}? (answer in naira)`, `${p}% of ${naira(base)}`, v, p === 10 ? `10% means divide by 10: ${fmt(base)} ÷ 10 = ${fmt(v)}.` : `${p}% is ${p}/100 = ${p === 50 ? "1/2" : p === 25 ? "1/4" : "3/4"} of ${fmt(base)}: ${fmt(v)}.`, `What is ${p} percent of ${base} naira?`);
    },
  },
  {
    id: "n17-longmult",
    track: "numeracy",
    level: 6,
    title: "Long multiplication",
    description: "Multiply 2-digit by 2-digit numbers.",
    generate: (rng) => {
      const a = rng.int(12, 99);
      const b = rng.int(12, 99);
      const t = Math.floor(b / 10) * 10;
      return numeric(`What is ${a} × ${b}?`, `${a} × ${b} = ?`, a * b, `${a} × ${t} = ${a * t}, ${a} × ${b - t} = ${a * (b - t)}; add them: ${a * b}.`, `What is ${a} times ${b}?`);
    },
  },
  {
    id: "n18-longdiv",
    track: "numeracy",
    level: 6,
    title: "Long division",
    description: "Divide 3-digit numbers by a 1-digit number.",
    generate: (rng) => {
      const b = rng.int(2, 9);
      const q = rng.int(Math.ceil(100 / b), Math.floor(999 / b));
      const a = b * q;
      return numeric(`What is ${a} ÷ ${b}?`, `${a} ÷ ${b} = ?`, q, `Divide digit by digit from the left: ${a} ÷ ${b} = ${q}. Check: ${q} × ${b} = ${a}.`, `What is ${a} divided by ${b}?`);
    },
  },
];

export type { Rng };
