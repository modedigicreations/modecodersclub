"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { tutorPlacementAnswer, tutorPlacementStart, tutorSkipPlacement } from "@/app/tutor/actions";
import type { ServedItem } from "@/lib/tutor/service";
import { ItemView } from "./item-view";
import { useSpeech } from "./use-speech";

const STAGES = [
  { stage: 1, label: "Just starting", hint: "Nursery or Primary 1–2" },
  { stage: 3, label: "Getting there", hint: "Primary 3–4" },
  { stage: 5, label: "Confident", hint: "Primary 5–6 or older" },
];

export function PlacementRunner({ track, trackTitle }: { track: string; trackTitle: string }) {
  const router = useRouter();
  const speech = useSpeech();
  const [served, setServed] = useState<ServedItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [asked, setAsked] = useState(0);
  const [done, setDone] = useState<{ mastered: number } | null>(null);
  const spokenFor = useRef<string | null>(null);
  const { speak, autoRead } = speech;

  useEffect(() => {
    if (!served || !autoRead || spokenFor.current === served.token) return;
    spokenFor.current = served.token;
    speak(served.item.speak);
  }, [served, autoRead, speak]);

  async function start(stage: number) {
    setBusy(true);
    setError("");
    try {
      setServed(await tutorPlacementStart(track, stage));
    } catch {
      setError("Couldn't start. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function answer(response: string) {
    if (!served || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await tutorPlacementAnswer(served.token, response);
      if (!res.ok) {
        // Usually an expired question (left open for hours): start the check again.
        setServed(null);
        setAsked(0);
        setError(`${res.error} Pick where to start again.`);
        return;
      }
      setAsked(res.asked);
      if (res.done) {
        setDone({ mastered: res.mastered });
        setServed(null);
      } else {
        setServed(res.next);
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    setBusy(true);
    setError("");
    try {
      await tutorSkipPlacement(track);
      router.push(`/tutor/${track}`);
    } catch {
      setError("Couldn't save that. Check your connection and try again.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="tutor-card tutor-summary">
        <div className="tutor-big-emoji" aria-hidden="true">🎯</div>
        <h2>All set!</h2>
        <p>
          {done.mastered > 0
            ? `You already know ${done.mastered} skill${done.mastered === 1 ? "" : "s"}, so we've skipped ahead. We'll still check them now and then.`
            : "We'll start from the very beginning and build up step by step."}
        </p>
        <button type="button" className="gz-btn gz-btn-primary" onClick={() => router.push(`/tutor/${track}`)}>
          Start learning →
        </button>
      </div>
    );
  }

  if (!served) {
    return (
      <div className="tutor-card">
        <h2 className="tutor-h2">Where shall we start in {trackTitle}?</h2>
        <p className="tutor-muted">
          Pick the closest one. A few quick questions will find exactly the right place. Wrong answers are fine: they help us!
        </p>
        <div className="tutor-stage-list">
          {STAGES.map((s) => (
            <button key={s.stage} type="button" className="tutor-choice tutor-stage" disabled={busy} onClick={() => start(s.stage)}>
              <strong>{s.label}</strong>
              <span>{s.hint}</span>
            </button>
          ))}
        </div>
        <button type="button" className="tutor-reveal" onClick={skip} disabled={busy}>
          Skip the questions and start from the beginning
        </button>
        {error && <p className="auth-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="tutor-card">
      <div className="tutor-topbar">
        <span className="tutor-skillname">Finding your level · {served.skill.title}</span>
        <span className="tutor-counter">Question {asked + 1}</span>
      </div>
      <ItemView item={served.item} disabled={busy} speech={speech} onAnswer={answer} />
      {error && <p className="auth-error">{error}</p>}
      <p className="tutor-muted" style={{ marginTop: 12 }}>No marks shown here: just do your best.</p>
    </div>
  );
}
