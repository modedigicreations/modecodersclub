import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { addParentLink, revokeParentLink } from "./parent-actions";

/** "Share with a parent" box on the tutor home page. */
export async function ParentLinks({ added, error }: { added?: boolean; error?: string }) {
  const session = await requireUser();
  const links = await prisma.tutorParentLink.findMany({
    where: { userId: session.user.id, revokedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, createdAt: true },
  });
  return (
    <div className="tutor-card" id="family">
      <h2 className="tutor-h2">👪 Share progress with a parent</h2>
      <p className="tutor-muted">
        They get a private link by email to see your levels, skills and streak. They can&rsquo;t change anything.
      </p>
      {error && <p className="auth-error">{error.slice(0, 200)}</p>}
      {added && !error && <p className="auth-success">Link sent! Ask them to check their email (and spam folder).</p>}
      {links.length > 0 && (
        <ul className="tutor-parent-list">
          {links.map((l) => (
            <li key={l.id}>
              <span>{l.email}</span>
              <form action={revokeParentLink.bind(null, l.id)}>
                <button type="submit" className="tutor-reveal">Stop sharing</button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={addParentLink} className="tutor-input-row">
        <input className="tutor-input" type="email" name="email" required placeholder="parent@example.com" aria-label="Parent's email" />
        <button type="submit" className="gz-btn gz-btn-primary">Send link</button>
      </form>
    </div>
  );
}
