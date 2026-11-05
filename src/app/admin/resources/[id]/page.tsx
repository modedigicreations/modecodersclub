import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { updateResource } from "../actions";
import { ResourceForm } from "../resource-form";

export default async function EditResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const resource = await prisma.freeResource.findUnique({ where: { id } });
  if (!resource) notFound();

  return (
    <div>
      <div className="admin-header">
        <h1>Edit {resource.name}</h1>
      </div>
      {error && <p className="auth-error">{error}</p>}
      <ResourceForm
        action={updateResource.bind(null, resource.id)}
        defaults={resource}
        submitLabel="Save changes"
        slugEditable={false}
      />
    </div>
  );
}
