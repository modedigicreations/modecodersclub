import Link from "next/link";
import prisma from "@/lib/prisma";
import { createResource, deleteResource, setResourceArchived } from "./actions";
import { ResourceForm } from "./resource-form";

export default async function AdminResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const resources = await prisma.freeResource.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <div className="admin-header">
        <h1>Free resources</h1>
      </div>

      {error && <p className="auth-error">{error}</p>}

      <ResourceForm action={createResource} submitLabel="Add resource" />

      {resources.length === 0 ? (
        <p className="admin-empty">No free resources yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource.id}>
                <td>
                  <strong>{resource.name}</strong>
                </td>
                <td>{resource.category}</td>
                <td>{resource.time}</td>
                <td>{resource.archivedAt ? "Archived" : "Active"}</td>
                <td>
                  <div className="admin-actions">
                    <Link href={`/admin/resources/${resource.id}`}>Edit</Link>
                    <form action={setResourceArchived.bind(null, resource.id, !resource.archivedAt)}>
                      <button type="submit">{resource.archivedAt ? "Unarchive" : "Archive"}</button>
                    </form>
                    <form action={deleteResource.bind(null, resource.id)}>
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
    </div>
  );
}
