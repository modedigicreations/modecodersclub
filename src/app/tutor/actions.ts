"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { isTrack } from "@/lib/tutor/skills";
import {
  answerPlacement,
  beginPlacement,
  explainItem,
  nextPracticeItem,
  savePlacement,
  submitPracticeAnswer,
  submitWriting,
} from "@/lib/tutor/service";

// Thin, authenticated wrappers: every action works only on the signed-in
// learner's own progress, and questions are marked on the server.

export async function tutorNext(track: string) {
  const session = await requireUser();
  if (!isTrack(track)) throw new Error("Unknown track");
  return nextPracticeItem(session.user.id, track);
}

export async function tutorAnswer(token: string, response: string) {
  const session = await requireUser();
  return submitPracticeAnswer(session.user.id, token, response);
}

export async function tutorWrite(token: string, text: string) {
  const session = await requireUser();
  return submitWriting(session.user.id, token, text);
}

export async function tutorExplain(token: string, response: string) {
  const session = await requireUser();
  return explainItem(session.user.id, token, response);
}

export async function tutorPlacementStart(track: string, stage: number) {
  const session = await requireUser();
  if (!isTrack(track)) throw new Error("Unknown track");
  const s = Number.isInteger(stage) && stage >= 1 && stage <= 6 ? stage : 1;
  return beginPlacement(session.user.id, track, s);
}

export async function tutorPlacementAnswer(token: string, response: string) {
  const session = await requireUser();
  const result = await answerPlacement(session.user.id, token, response);
  if (result.ok && result.done) revalidatePath("/tutor");
  return result;
}

/** "Start from the beginning" instead of taking the placement test. */
export async function tutorSkipPlacement(track: string) {
  const session = await requireUser();
  if (!isTrack(track)) throw new Error("Unknown track");
  await savePlacement(session.user.id, track, 0, 0, 0);
  revalidatePath("/tutor");
}
