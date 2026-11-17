import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { IMAGE_MAX_BYTES, explainR2Error, r2Configured, sniffImage, uploadImage } from "@/lib/r2";

/** Same-site requests only (the upload comes from the admin editor). */
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set<string>();
  if (process.env.BETTER_AUTH_URL) allowed.add(new URL(process.env.BETTER_AUTH_URL).origin);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  if (host) allowed.add(`${proto}://${host}`);
  return allowed.has(origin);
}

/** POST multipart "file" (an image, 5 MB max). Admins only. Returns { url }. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  if (!r2Configured()) {
    return NextResponse.json({ error: "Image uploads aren't set up yet (R2 storage settings are missing)." }, { status: 503 });
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > IMAGE_MAX_BYTES + 64 * 1024) return NextResponse.json({ error: "Images can be up to 5 MB." }, { status: 413 });

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "Upload an image file." }, { status: 400 });
  }
  if (!(file instanceof File)) return NextResponse.json({ error: "Upload an image file." }, { status: 400 });
  if (file.size > IMAGE_MAX_BYTES) return NextResponse.json({ error: "Images can be up to 5 MB." }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniffImage(bytes)) {
    return NextResponse.json({ error: "Use a JPG, PNG, WebP or GIF image." }, { status: 415 });
  }
  try {
    const url = await uploadImage(bytes, "blog");
    return NextResponse.json({ url });
  } catch (error) {
    const reason = explainR2Error(error);
    const e = error as { name?: string; message?: string };
    console.error("[uploads] R2 upload failed:", e?.name, e?.message);
    return NextResponse.json({ error: `The upload failed. ${reason}` }, { status: 502 });
  }
}
