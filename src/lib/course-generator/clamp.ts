import type { Curriculum, LessonDraft } from "./schemas";
import { COURSE_COLORS } from "./schemas";

// Everything Claude returns is re-checked here before it touches the database:
// column limits (VarChar), the assessment shape the lesson page expects, and
// lesson count. Pure functions, unit-tested in tests/course-generator.test.ts.

/** Trim and cut to `max` characters, preferring a sentence/paragraph/word boundary. */
export function clampText(value: unknown, max: number): string {
  const text = typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "";
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const cut = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf(". "), slice.lastIndexOf(" "));
  return (cut > max * 0.6 ? slice.slice(0, cut + (slice[cut] === "." ? 1 : 0)) : slice).trim();
}

/** Plain ASCII only: the course icon is rendered in a fixed-size badge. */
function clampIcon(value: unknown): string {
  const ascii = (typeof value === "string" ? value : "").replace(/[^\x21-\x7E]/g, "");
  return ascii.slice(0, 4) || "</>";
}

export type CleanCourse = {
  name: string;
  category: string;
  level: string;
  description: string;
  icon: string;
  color: (typeof COURSE_COLORS)[number];
  duration: string;
  audience: string;
  outcomes: string[];
};

export type PlannedLesson = {
  moduleNumber: number;
  moduleTitle: string;
  title: string;
  objectives: string[];
  hasCodingLab: boolean;
};

export function cleanCurriculum(raw: Curriculum, lessonTarget: number): { course: CleanCourse; lessons: PlannedLesson[] } {
  const c = raw.course;
  const course: CleanCourse = {
    name: clampText(c.name, 120) || "New course",
    category: clampText(c.category, 80) || "Programming",
    level: clampText(c.tagline, 160) || "Learn by building",
    description: clampText(c.description, 500),
    icon: clampIcon(c.icon),
    color: (COURSE_COLORS as readonly string[]).includes(c.color) ? c.color : "blue",
    duration: clampText(c.duration, 80) || "Self-paced",
    audience: clampText(c.audience, 300),
    outcomes: (c.outcomes ?? []).map((o) => clampText(o, 200)).filter(Boolean).slice(0, 8),
  };
  if (!course.description) course.description = clampText(`${course.name}: ${course.level}`, 500);
  if (!course.audience) course.audience = "Learners who want to build practical skills.";
  if (course.outcomes.length === 0) course.outcomes = [`Understand the core ideas of ${course.name}`];

  const lessons: PlannedLesson[] = [];
  (raw.modules ?? []).forEach((m, mi) => {
    for (const l of m.lessons ?? []) {
      const title = clampText(l.title, 140);
      if (!title) continue;
      lessons.push({
        moduleNumber: mi + 1,
        moduleTitle: clampText(m.title, 100) || `Module ${mi + 1}`,
        title,
        objectives: (l.objectives ?? []).map((o) => clampText(o, 200)).filter(Boolean).slice(0, 5),
        hasCodingLab: Boolean(l.hasCodingLab),
      });
    }
  });
  return { course, lessons: lessons.slice(0, lessonTarget) };
}

export type CleanQuestion = { question: string; options: string[]; correctIndex: number };

/** Keeps only well-formed questions: text, exactly 4 distinct non-empty options, a valid correct index. */
export function cleanQuiz(quiz: LessonDraft["quiz"] | undefined): CleanQuestion[] {
  const out: CleanQuestion[] = [];
  for (const q of quiz ?? []) {
    const question = clampText(q?.question, 500);
    const options = (q?.options ?? []).map((o) => clampText(o, 200));
    const idx = q?.correctIndex;
    if (!question || options.length !== 4 || options.some((o) => !o)) continue;
    if (new Set(options.map((o) => o.toLowerCase())).size !== 4) continue;
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) continue;
    out.push({ question, options, correctIndex: idx });
  }
  return out.slice(0, 10);
}

export type CleanLab = { instructions: string; starterHtml: string; starterCss: string; starterJs: string };

export function cleanLab(lab: LessonDraft["lab"] | undefined): CleanLab | null {
  if (!lab) return null;
  const instructions = clampText(lab.instructions, 4000);
  if (!instructions) return null;
  return {
    instructions,
    starterHtml: clampText(lab.starterHtml, 4000),
    starterCss: clampText(lab.starterCss, 4000),
    starterJs: clampText(lab.starterJs, 4000),
  };
}

/** Lesson text as stored: a module line, then the body, within the 8000-character column. */
export function lessonContent(lesson: PlannedLesson, body: string): string {
  const header = `Module ${lesson.moduleNumber}: ${lesson.moduleTitle}\n\n`;
  return header + clampText(body, 8000 - header.length);
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "") || "course"
  );
}
