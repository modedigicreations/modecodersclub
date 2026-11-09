import { NextResponse } from "next/server";
import type { Anthropic } from "@anthropic-ai/sdk";
import { canManageCourse, getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { GENERATE_MODEL, getAnthropic } from "@/lib/anthropic";
import { GENERATE_DAILY_LIMIT, checkAndIncrement } from "@/lib/ai-rate-limit";

type RouteContext = { params: Promise<{ lessonId: string }> };

type LabDraft = {
  instructions: string;
  starterHtml: string;
  starterCss: string;
  starterJs: string;
};

const DRAFT_TOOL: Anthropic.Tool = {
  name: "submit_lab_draft",
  description: "Submit the drafted coding lab.",
  input_schema: {
    type: "object",
    properties: {
      instructions: { type: "string", description: "Instructions for the student, 1-3 short paragraphs." },
      starterHtml: { type: "string", description: "Minimal starter HTML, leaving real work for the student." },
      starterCss: { type: "string", description: "Minimal starter CSS." },
      starterJs: { type: "string", description: "Minimal starter JavaScript." },
    },
    required: ["instructions", "starterHtml", "starterCss", "starterJs"],
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

  const body = await request.json().catch(() => null) as { topic?: unknown; difficulty?: unknown } | null;
  const topic = typeof body?.topic === "string" ? body.topic.trim().slice(0, 300) : "";
  const difficulty = typeof body?.difficulty === "string" ? body.difficulty.trim().slice(0, 40) : "beginner";
  if (!topic) return NextResponse.json({ error: "Enter a topic for the lab." }, { status: 400 });

  try {
    const response = await getAnthropic().messages.create({
      model: GENERATE_MODEL,
      max_tokens: 2000,
      system:
        "You write short, beginner-friendly HTML/CSS/JS coding labs for a students' coding club. " +
        "Call the submit_lab_draft tool exactly once with your draft. Keep starter code minimal " +
        "(a handful of lines) so the student has real work left to do — never submit a finished solution.",
      messages: [
        { role: "user", content: `Lesson: "${lesson.title}". Topic: ${topic}. Difficulty: ${difficulty}.` },
      ],
      tools: [DRAFT_TOOL],
      tool_choice: { type: "tool", name: "submit_lab_draft" },
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") throw new Error("no draft returned");
    return NextResponse.json({ draft: toolUse.input as LabDraft });
  } catch (error) {
    console.error("Lab AI generation failed", error);
    return NextResponse.json({ error: "AI generation failed. Try again." }, { status: 502 });
  }
}
