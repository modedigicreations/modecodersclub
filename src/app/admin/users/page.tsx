import Link from "next/link";
import prisma from "@/lib/prisma";
import { deleteUser } from "./actions";

const PAGE_SIZE = 50;
const ROLES = ["admin", "instructor", "learner"] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; role?: string; page?: string }>;
}) {
  const { error, q, role, page: pageParam } = await searchParams;
  const search = (q ?? "").trim();
  const roleFilter = ROLES.includes(role as (typeof ROLES)[number]) ? role : "";
  const page = Math.max(1, Number(pageParam) || 1);

  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(roleFilter ? { role: roleFilter } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (roleFilter) params.set("role", roleFilter);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Users</h1>
      </div>

      {error && <p className="auth-error">{error}</p>}

      <form className="admin-user-filters" method="GET">
        <input type="search" name="q" placeholder="Search name or email…" defaultValue={search} />
        <select name="role" defaultValue={roleFilter}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r[0].toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
        <button className="button button-small" type="submit">
          Filter
        </button>
        {(search || roleFilter) && (
          <Link className="text-link" href="/admin/users">
            Clear
          </Link>
        )}
      </form>

      <p className="admin-user-count">
        {total === 0 ? "No users match." : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
      </p>

      {users.length === 0 ? (
        <p className="admin-empty">No users found.</p>
      ) : (
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
      )}

      {totalPages > 1 && (
        <div className="admin-pagination">
          {page > 1 ? (
            <Link className="text-link text-link-back" href={pageHref(page - 1)}>
              <span aria-hidden="true">←</span> Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="admin-pagination-status">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link className="text-link" href={pageHref(page + 1)}>
              Next <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
