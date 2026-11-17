import Anthropic from "@anthropic-ai/sdk";

// Built lazily, on first actual use — not at module import time — for the
// same reason as src/lib/prisma.ts and src/lib/auth.ts: `next build`
// statically imports every route module, and ANTHROPIC_API_KEY isn't set
// in that environment.
let client: Anthropic | undefined;

export function getAnthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY must be set to use AI features.");
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const HINT_MODEL = "claude-haiku-5-5";
export const GENERATE_MODEL = "claude-sonnet-5-5";

// AI course generator (A-EduNet, src/lib/course-generator). Switch to
// "claude-sonnet-5-5" to roughly halve the cost per generated course.
export const COURSE_GENERATE_MODEL = "claude-opus-5-5";
// USD per million tokens for COURSE_GENERATE_MODEL, used only to show an
// approximate cost per generated course in the admin.
export const COURSE_GENERATE_PRICE_PER_MTOK = { input: 4, output: 20 };
