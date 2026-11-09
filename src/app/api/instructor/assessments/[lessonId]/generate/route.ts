import { NextResponse } from "next/server";
import type { Anthropic } from "@anthropic-ai/sdk";
import { canManageCourse, getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { GENERATE_MODEL, getAnthropic } from "@/lib/anthropic";
import { GENERATE_DAILY_LIMIT, checkAndIncrement } from "@/lib/ai-rate-limit";

type RouteContext = { params: Promise<{ lessonId: string }> };

type AssessmentDraft = {
  questions: { question: string; options: string[]; correctIndex: number }[];
};

const DRAFT_TOOL: Anthropic.Tool = {
  name: "submit_assessment_draft",
  description: "Submit the drafted multiple-choice assessment.",
  input_schema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        description: "The quiz questions.",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
            correctIndex: { type: "integer", description: "Index (0-3) of the correct option.", minimum: 0, maximum: 3 },
          },
          required: ["question", "options", "correctIndex"],
        },
      },
    },
    required: ["questions"],
  },
};

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });

  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true, title: true } });
  if (!lesson) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  if (!(await canManageCourse(session, lesson.courseId))) {
    return NextResponse.json({ error: "You don't have access to this course." }, { status: 403 });
  }

  if (!checkAndIncrement(`generate:${session.user.id}`, GENERATE_DAILY_LIMIT)) {
    return NextResponse.json({ error: "Daily AI generation limit reached. Try again tomorrow." }, { status: 429 });
  }

  const body = await request.json().catch(() => null) as { topic?: unknown; difficulty?: unknown; count?: unknown } | null;
  const topic = typeof body?.topic === "string" ? body.topic.trim().slice(0, 300) : "";
  const difficulty = typeof body?.difficulty === "string" ? body.difficulty.trim().slice(0, 40) : "beginner";
  const count = typeof body?.count === "number" && Number.isInteger(body.count) ? Math.min(Math.max(body.count, 3), 10) : 5;
  if (!topic) return NextResponse.json({ error: "Enter a topic for the assessment." }, { status: 400 });

  try {
    const response = await getAnthropic().messages.create({
      model: GENERATE_MODEL,
      max_tokens: 2500,
      system:
        "You write short multiple-choice assessments for a students' coding club. " +
        "Call the submit_assessment_draft tool exactly once. Every question needs exactly 4 options " +
        "and a correctIndex from 0-3. Keep questions unambiguous and at the stated difficulty.",
      messages: [
        { role: "user", content: `Lesson: "${lesson.title}". Topic: ${topic}. Difficulty: ${difficulty}. Write ${count} questions.` },
      ],
      tools: [DRAFT_TOOL],
      tool_choice: { type: "tool", name: "submit_assessment_draft" },
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") throw new Error("no draft returned");
    return NextResponse.json({ draft: toolUse.input as AssessmentDraft });
  } catch (error) {
    console.error("Assessment AI generation failed", error);
    return NextResponse.json({ error: "AI generation failed. Try again." }, { status: 502 });
  }
}
