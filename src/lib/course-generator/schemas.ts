import { z } from "zod";

// Shapes Claude must return (structured outputs). Length limits are stated in
// the prompts and enforced again in code (clamp.ts) because the database
// columns are VarChar-limited and structured outputs don't enforce lengths.

export const COURSE_COLORS = ["orange", "mint", "lavender", "blue", "pink", "teal"] as const;

export const CurriculumSchema = z.object({
  course: z.object({
    name: z.string().describe("Course title, at most 100 characters."),
    category: z.string().describe("Short category, e.g. 'Web development', at most 40 characters."),
    tagline: z.string().describe("One-line hook shown under the title, at most 80 characters."),
    description: z.string().describe("Catalogue description, 1-2 sentences, at most 400 characters."),
    icon: z.string().describe("2-4 plain ASCII characters that evoke the topic, e.g. '</>' or '{ }'."),
    color: z.enum(COURSE_COLORS),
    duration: z.string().describe("Realistic duration, e.g. '8 weeks, 2 sessions a week'."),
    audience: z.string().describe("Who it's for, one sentence, at most 250 characters."),
    outcomes: z.array(z.string()).describe("3-6 concrete learning outcomes, each at most 140 characters."),
  }),
  modules: z
    .array(
      z.object({
        title: z.string().describe("Module title, at most 80 characters."),
        lessons: z.array(
          z.object({
            title: z.string().describe("Lesson title, at most 100 characters."),
            objectives: z.array(z.string()).describe("2-4 things the learner can do after this lesson."),
            hasCodingLab: z
              .boolean()
              .describe("True only if a short hands-on HTML/CSS/JavaScript browser exercise fits this lesson."),
          }),
        ),
      }),
    )
    .describe("Ordered modules; lessons inside each module are ordered."),
});
export type Curriculum = z.infer<typeof CurriculumSchema>;

export const LessonDraftSchema = z.object({
  content: z
    .string()
    .describe(
      "The full lesson as plain text (no Markdown symbols), 700-1100 words, at most 7000 characters. " +
        "Short paragraphs separated by blank lines; section headings on their own line in Title Case; " +
        "lists as lines starting with '- '; code examples indented by 4 spaces.",
    ),
  quiz: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).describe("Exactly 4 answer options."),
        correctIndex: z.number().int().describe("Index 0-3 of the correct option."),
      }),
    )
    .describe("Exactly 5 multiple-choice questions that check this lesson's objectives."),
  lab: z
    .object({
      instructions: z.string().describe("Step-by-step task for the learner, at most 1500 characters."),
      starterHtml: z.string().describe("Starter HTML (may be empty), at most 3000 characters."),
      starterCss: z.string().describe("Starter CSS (may be empty), at most 3000 characters."),
      starterJs: z.string().describe("Starter JavaScript (may be empty), at most 3000 characters."),
      checks: z
        .array(z.string())
        .describe(
          'Auto-grading checks, 2-6 lines, one per instruction step. Formats: \'html: <css selector> [*N] ["text"] | message\', ' +
            '\'css: <selector> { <property>[: value] } | message\', \'js: <exact code text> | message\'. ' +
            'The message tells the learner what the check wants, e.g. \'html: ul > li *3 | List at least three hobbies\'.',
        ),
    })
    .nullable()
    .describe("A browser coding lab, or null when no lab was requested for this lesson."),
});
export type LessonDraft = z.infer<typeof LessonDraftSchema>;
