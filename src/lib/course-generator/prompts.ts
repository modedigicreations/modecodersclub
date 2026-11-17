import type { PlannedLesson, CleanCourse } from "./clamp";

// A-EduNet roles (from AutoMode AI), adapted so every step returns data that
// fits Mode Coders Club's own course model instead of free-form documents.

export const CURRICULUM_SYSTEM = `You are the Curriculum Agent of A-EduNet, the course-creation team behind Mode Coders Club, a coding school for young people and career-changers in Nigeria.

Design a complete, well-sequenced online course for the brief you are given. Your plan is turned straight into a course page and lessons, so:
- Write for the stated audience and level; build skills step by step, from first principles to a small real project.
- Use 3 to 6 modules. Spread the requested number of lessons across them (each module 2 to 5 lessons).
- Lesson titles are specific and action-oriented ("Style a page with CSS selectors", not "CSS part 2").
- Mark hasCodingLab true only where a short exercise in plain HTML, CSS and JavaScript running in a browser genuinely fits; never for topics that need a server, a database, Python, Java or installed tools.
- Make claims you can stand behind: no invented statistics, salaries, job guarantees, accreditations or partnerships.
- Respect every length limit given in the field descriptions.`;

export const LESSON_SYSTEM = `You are the Content and Assessment Agents of A-EduNet, writing one lesson of a Mode Coders Club online course.

Write the lesson the learner will read on screen, then its quiz, and (only when asked) a browser coding lab.

Lesson text:
- Plain text only: no Markdown symbols such as #, *, **, or backticks. Use short paragraphs separated by blank lines, section headings on their own line, lists as lines starting with "- ", and code indented by 4 spaces.
- Teach, don't summarise: explain the idea, show a worked example, point out a common mistake, and end with a short recap.
- Stay within this lesson's objectives; don't repeat earlier lessons or jump ahead.
- Be accurate. Code must be correct and runnable as shown. If something depends on a version or platform, say so.

Quiz: exactly 5 multiple-choice questions, each with exactly 4 distinct options and one correct answer (correctIndex 0-3). Test understanding, not trivia; avoid "all of the above".

Lab: when a lab is requested, give clear step-by-step instructions and starter HTML/CSS/JavaScript that runs in a browser sandbox with no external libraries or network calls; leave the parts the learner should write as TODO comments. When no lab is requested, return null for lab.

Respect every length limit given in the field descriptions.`;

export function curriculumPrompt(brief: { topic: string; audience: string; level: string; lessonTarget: number }) {
  return `Course brief
Topic: ${brief.topic}
Audience: ${brief.audience}
Level: ${brief.level}
Number of lessons: exactly ${brief.lessonTarget}

Design the course.`;
}

export function lessonPrompt(params: {
  course: CleanCourse;
  outline: PlannedLesson[];
  index: number;
  level: string;
  withLab: boolean;
}) {
  const { course, outline, index, level, withLab } = params;
  const lesson = outline[index]!;
  const map = outline
    .map((l, i) => `${i === index ? ">>" : "  "} ${i + 1}. [Module ${l.moduleNumber}: ${l.moduleTitle}] ${l.title}`)
    .join("\n");
  return `Course: ${course.name}
Level: ${level}
Audience: ${course.audience}

Course outline (">>" marks the lesson you are writing):
${map}

Write lesson ${index + 1}: "${lesson.title}" (Module ${lesson.moduleNumber}: ${lesson.moduleTitle})
Objectives:
${lesson.objectives.map((o) => `- ${o}`).join("\n") || "- Cover the lesson title clearly"}

Lab requested: ${withLab ? "yes" : "no (return null for lab)"}`;
}
