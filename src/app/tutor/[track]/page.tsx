import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { TRACKS, isTrack } from "@/lib/tutor/skills";
import { getTrackOverview } from "@/lib/tutor/service";
import { PracticeSession } from "@/components/tutor/practice-session";

export const instant = false;
export const metadata: Metadata = { title: "Practice" };

export default async function TrackPage({ params }: { params: Promise<{ track: string }> }) {
  const { track } = await params;
  if (!isTrack(track)) notFound();
  const session = await requireUser(`/tutor/${track}`);
  const overview = await getTrackOverview(session.user.id, track);
  if (!overview.placement && overview.skills.every((s) => s.attempts === 0)) redirect(`/tutor/${track}/placement`);
  const meta = TRACKS[track];
  return (
    <main className="tutor-page">
      <div className="container tutor-narrow">
        <p className="tutor-crumb">
          <Link href="/tutor">← My tutor</Link> · {meta.emoji} {meta.title} · Stage {overview.stage}
        </p>
        <PracticeSession track={track} trackTitle={meta.title} />
      </div>
    </main>
  );
}
