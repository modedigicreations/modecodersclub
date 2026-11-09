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

// Shared by requireInstructorAccess (Server Components/Actions, which may
// redirect) and API route handlers (which can't redirect and need a plain
// boolean to turn into a 401/403 JSON response instead).
export async function canManageCourse(
  session: { user: { id: string; role?: string | null } },
  courseId: string,
): Promise<boolean> {
  if (session.user.role === "admin") return true;
  if (session.user.role !== "instructor") return false;

  const assignment = await prisma.courseInstructor.findUnique({
    where: { courseId_userId: { courseId, userId: session.user.id } },
  });
  return assignment !== null;
}

// Allows an admin (any course) or the course's own assigned instructor.
// Used by the shared /instructor workspace, which both roles work from.
export async function requireInstructorAccess(courseId: string) {
  const session = await requireUser();
  if (await canManageCourse(session, courseId)) return session;
  redirect(session.user.role === "instructor" ? "/instructor" : "/");
}
