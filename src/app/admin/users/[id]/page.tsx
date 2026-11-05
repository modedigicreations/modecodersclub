import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { updateUser } from "../actions";

const ROLES = ["admin", "instructor", "learner"] as const;

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  return (
    <div>
      <div className="admin-header">
        <h1>Edit {user.name}</h1>
      </div>
      {error && <p className="auth-error">{error}</p>}
      <form className="admin-form" action={updateUser.bind(null, user.id)}>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" defaultValue={user.email} readOnly />
        </div>
        <div className="admin-form-row">
          <div>
            <label htmlFor="name">Name</label>
            <input id="name" name="name" defaultValue={user.name} required />
          </div>
          <div>
            <label htmlFor="role">Role</label>
            <select id="role" name="role" defaultValue={user.role} required>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="button button-primary" type="submit" style={{ justifySelf: "start" }}>
          Save changes
        </button>
      </form>
    </div>
  );
}
