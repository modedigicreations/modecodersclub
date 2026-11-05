import Link from "next/link";
import prisma from "@/lib/prisma";
import { deleteUser } from "./actions";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="admin-header">
        <h1>Users</h1>
      </div>

      {error && <p className="auth-error">{error}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td style={{ textTransform: "capitalize" }}>{user.role}</td>
              <td>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(user.createdAt)}</td>
              <td>
                <div className="admin-actions">
                  <Link href={`/admin/users/${user.id}`}>Edit</Link>
                  <form action={deleteUser.bind(null, user.id)}>
                    <button type="submit" className="danger">
                      Delete
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
