import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export type UserRole = "admin" | "instructor" | "learner";

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.user.role !== "admin") redirect("/");
  return session;
}

// Allows an admin (any course) or the course's own assigned instructor.
// Used by the shared /instructor workspace, which both roles work from.
export async function requireInstructorAccess(courseId: string) {
  const session = await requireUser();
  if (session.user.role === "admin") return session;

  if (session.user.role !== "instructor") redirect("/");

  const assignment = await prisma.courseInstructor.findUnique({
    where: { courseId_userId: { courseId, userId: session.user.id } },
  });
  if (!assignment) redirect("/instructor");

  return session;
}
