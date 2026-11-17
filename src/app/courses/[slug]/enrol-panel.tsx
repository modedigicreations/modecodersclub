import Link from "next/link";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hasActiveSubscription } from "@/lib/subscriptions";
import { enrolSelf } from "../actions";

/** Who's looking decides what the course page offers: sign in, enrol, subscribe, or continue. */
export async function EnrolPanel({ courseId, isFree, courseName }: { courseId: string; isFree: boolean; courseName: string }) {
  const session = await getSession();
  if (!session) {
    return (
      <div className="course-detail-cta">
        <p>Create a free account or sign in to enrol in {courseName}.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="button button-primary" href="/register">Create an account</Link>
          <Link className="text-link" href="/login">Sign in <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    );
  }

  if (session.user.role === "admin" || session.user.role === "instructor") {
    return (
      <div className="course-detail-cta">
        <p>You&rsquo;re signed in as staff.</p>
        <Link className="button button-primary" href={`/instructor/courses/${courseId}`}>Manage this course</Link>
      </div>
    );
  }

  const enrolled = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId, userId: session.user.id } },
    select: { id: true },
  });
  if (enrolled) {
    return (
      <div className="course-detail-cta">
        <p>You&rsquo;re enrolled in this course.</p>
        <Link className="button button-primary" href={`/dashboard/courses/${courseId}`}>
          Go to the course <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  const isSchool = (session.user as { isEnterpriseSso?: boolean }).isEnterpriseSso ?? false;
  const canEnrol = isFree || isSchool || (await hasActiveSubscription(session.user.id));
  if (!canEnrol) {
    return (
      <div className="course-detail-cta">
        <p>This course is included with a Premium subscription.</p>
        <Link className="button button-primary" href="/dashboard/billing">
          Subscribe to enrol <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="course-detail-cta">
      <p>{isFree ? "This course is free." : "Included with your subscription."} Start learning now.</p>
      <form action={enrolSelf.bind(null, courseId)}>
        <button className="button button-primary" type="submit">Enrol now</button>
      </form>
    </div>
  );
}
