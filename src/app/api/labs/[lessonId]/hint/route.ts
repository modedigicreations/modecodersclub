import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { HINT_MODEL, getAnthropic } from "@/lib/anthropic";
import { HINT_DAILY_LIMIT, checkAndIncrement } from "@/lib/ai-rate-limit";

type RouteContext = { params: Promise<{ lessonId: string }> };

const MAX_CODE_LENGTH = 4000;

// Ephemeral by design: the hint is generated and returned, never written
// to the DB. Only the lab's own instructions/starter code and the
// student's current code are sent to the model — never the student's
// name or email ("no student PII is accessed or stored").
export async function POST(request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });

  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true, title: true } });
  if (!lesson) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });

  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId: lesson.courseId, userId: session.user.id } },
  });
  if (!enrollment) return NextResponse.json({ error: "You're not enrolled in this course." }, { status: 403 });

  const lab = await prisma.lab.findUnique({ where: { lessonId } });
  if (!lab) return NextResponse.json({ error: "This lesson has no lab." }, { status: 404 });
  if (!lab.hintsEnabled) return NextResponse.json({ error: "Hints aren't enabled for this lab." }, { status: 403 });

  if (!checkAndIncrement(`hint:${session.user.id}`, HINT_DAILY_LIMIT)) {
    return NextResponse.json({ error: "You've used today's hints. Try again tomorrow." }, { status: 429 });
  }

  const body = await request.json().catch(() => null) as { html?: unknown; css?: unknown; js?: unknown } | null;
  const html = typeof body?.html === "string" ? body.html.slice(0, MAX_CODE_LENGTH) : "";
  const css = typeof body?.css === "string" ? body.css.slice(0, MAX_CODE_LENGTH) : "";
  const js = typeof body?.js === "string" ? body.js.slice(0, MAX_CODE_LENGTH) : "";

  try {
    const response = await getAnthropic().messages.create({
      model: HINT_MODEL,
      max_tokens: 300,
      system:
        "You are a coding tutor for a students' coding club. A student is stuck on a lab and clicked " +
        "a \"Get a hint\" button — they cannot type free-form questions, only request a hint. " +
        "Look at the lab's instructions and the student's current code, then give ONE short hint " +
        "(2-4 sentences) that helps them reason through the next step themselves. Ask a guiding " +
        "question or point at the relevant concept. NEVER write corrected code, a full solution, " +
        "or a finished version of what they're missing.",
      messages: [
        {
          role: "user",
          content:
            `Lab for "${lesson.title}":\n\nInstructions:\n${lab.instructions}\n\n` +
            `Student's current code —\nHTML:\n${html}\n\nCSS:\n${css}\n\nJS:\n${js}\n\n` +
            "Give the student one short hint.",
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const hint = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    if (!hint) throw new Error("no hint returned");
    return NextResponse.json({ hint });
  } catch (error) {
    console.error("Lab hint generation failed", error);
    return NextResponse.json({ error: "Couldn't get a hint right now. Try again." }, { status: 502 });
  }
}
