// Browser helper: sends an image to the admin upload route and returns its URL.
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX = 5 * 1024 * 1024;

export async function uploadImageFile(file: File): Promise<string> {
  if (!IMAGE_ACCEPT.split(",").includes(file.type)) throw new Error("Use a JPG, PNG, WebP or GIF image.");
  if (file.size > MAX) throw new Error("Images can be up to 5 MB.");
  const body = new FormData();
  body.set("file", file);
  const response = await fetch("/api/admin/uploads/image", { method: "POST", body });
  const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !data.url) throw new Error(data.error ?? "The upload failed. Try again.");
  return data.url;
}

/** "my-team_photo.JPG" -> "my team photo" (a starting point for the alt text). */
export function altFromName(name: string) {
  return name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim().slice(0, 200);
}
