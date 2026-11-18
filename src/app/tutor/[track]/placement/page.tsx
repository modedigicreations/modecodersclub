import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { TRACKS, isTrack } from "@/lib/tutor/skills";
import { PlacementRunner } from "@/components/tutor/placement-runner";

export const instant = false;
export const metadata: Metadata = { title: "Find your level" };

export default async function PlacementPage({ params }: { params: Promise<{ track: string }> }) {
  const { track } = await params;
  if (!isTrack(track)) notFound();
  await requireUser();
  const meta = TRACKS[track];
  return (
    <main className="tutor-page">
      <div className="container tutor-narrow">
        <p className="tutor-crumb">
          <Link href="/tutor">← My tutor</Link> · {meta.emoji} {meta.title}
        </p>
        <PlacementRunner track={track} trackTitle={meta.title} />
      </div>
    </main>
  );
}
