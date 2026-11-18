"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { tutorAnswer, tutorExplain, tutorNext, tutorWrite } from "@/app/tutor/actions";
import type { AnswerResult, ServedItem, WritingResult } from "@/lib/tutor/service";
import { ItemView } from "./item-view";
import { useSpeech } from "./use-speech";

const SESSION_LENGTH = 10;
const CHEERS = ["Great job!", "Well done!", "Brilliant!", "You got it!", "Excellent!", "Super!"];
const BADGE_NAMES: Record<string, string> = {
  "word-wizard": "📖 Word Wizard",
  "number-ninja": "🧮 Number Ninja",
  "first-lesson": "🚀 Lift-off",
  "streak-3": "🔥 On a roll",
  "streak-7": "⚡ Week warrior",
  "streak-30": "🏆 Unstoppable",
};

type Feedback =
  | { type: "answer"; result: Extract<AnswerResult, { ok: true }>; response: string }
  | { type: "write"; result: Extract<WritingResult, { ok: true }> };

export function PracticeSession({ track, trackTitle }: { track: string; trackTitle: string }) {
  const speech = useSpeech();
  const [served, setServed] = useState<ServedItem | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);
  const [right, setRight] = useState(0);
  const [mastered, setMastered] = useState<string[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    setFeedback(null);
    setExplanation(null);
    try {
      setServed(await tutorNext(track));
    } catch {
      setError("Couldn't load the next question. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }, [track]);

  useEffect(() => {
    // First question on arrival.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Read each new question aloud once (if switched on).
  const spokenFor = useRef<string | null>(null);
  const { speak, autoRead } = speech;
  useEffect(() => {
    if (!served || !autoRead || spokenFor.current === served.token) return;
    spokenFor.current = served.token;
    speak(served.item.speak);
  }, [served, autoRead, speak]);

  useEffect(() => {
    if (feedback) nextRef.current?.focus();
  }, [feedback]);

  async function answer(response: string) {
    if (!served || busy || feedback) return;
    setBusy(true);
    setError("");
    try {
      if (served.item.kind === "write") {
        const res = await tutorWrite(served.token, response);
        if (!res.ok) return setError(res.error);
        setFeedback({ type: "write", result: res });
        if (res.passed) setRight((r) => r + 1);
        if (res.justMastered) setMastered((m) => [...m, served.skill.title]);
        setBadges((b) => [...b, ...res.newBadges]);
      } else {
        const res = await tutorAnswer(served.token, response);
        if (!res.ok) {
          setError(res.error);
          if (res.error.includes("expired")) void load();
          return;
        }
        setFeedback({ type: "answer", result: res, response });
        if (res.correct) {
          setRight((r) => r + 1);
          speech.speak(CHEERS[Math.floor(Math.random() * CHEERS.length)]);
        }
        if (res.justMastered) setMastered((m) => [...m, res.skillTitle]);
        setBadges((b) => [...b, ...res.newBadges]);
      }
      setCount((c) => c + 1);
    } catch {
      setError("Something went wrong sending your answer. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function explainMore() {
    if (!served || feedback?.type !== "answer") return;
    setBusy(true);
    const res = await tutorExplain(served.token, feedback.response).catch(() => null);
    setBusy(false);
    setExplanation(res ? (res.ok ? res.text : res.error) : "Couldn't reach the tutor. Try again later.");
  }

  function next() {
    if (count >= SESSION_LENGTH) {
      setFinished(true);
      speech.stop();
      return;
    }
    void load();
  }

  if (finished) {
    const pct = Math.round((right / Math.max(1, count)) * 100);
    return (
      <div className="tutor-card tutor-summary">
        <div className="tutor-big-emoji" aria-hidden="true">{pct >= 80 ? "🌟" : pct >= 50 ? "👏" : "💪"}</div>
        <h2>
          {right} out of {count} right
        </h2>
        <p>{pct >= 80 ? "Fantastic work!" : pct >= 50 ? "Good effort! Practice makes progress." : "Keep going: every try makes you stronger."}</p>
        {mastered.length > 0 && (
          <div className="tutor-unlocked">
            <strong>New skill{mastered.length > 1 ? "s" : ""} mastered:</strong>
            <ul>{mastered.map((m) => <li key={m}>✅ {m}</li>)}</ul>
          </div>
        )}
        {badges.length > 0 && (
          <p className="tutor-unlocked">
            <strong>Badge unlocked:</strong> {badges.map((b) => BADGE_NAMES[b] ?? b).join(", ")}
          </p>
        )}
        <div className="gz-actions" style={{ justifyContent: "center" }}>
          <button
            type="button"
            className="gz-btn gz-btn-primary"
            onClick={() => {
              setFinished(false);
              setCount(0);
              setRight(0);
              setMastered([]);
              setBadges([]);
              void load();
            }}
          >
            Keep practising
          </button>
          <Link className="gz-btn tutor-btn-quiet" href="/tutor">
            Back to my tutor
          </Link>
        </div>
      </div>
    );
  }

  const answered = feedback?.type === "answer" ? feedback.result : null;

  return (
    <div className="tutor-card" data-q={served?.token.slice(-10)} aria-busy={busy}>
      <div className="tutor-topbar">
        <span className="tutor-skillname">
          {served?.review ? "🔁 Review · " : ""}
          {served?.skill.title ?? trackTitle}
        </span>
        <span className="tutor-counter" aria-label={`Question ${Math.min(count + 1, SESSION_LENGTH)} of ${SESSION_LENGTH}`}>
          {Math.min(count + (feedback ? 0 : 1), SESSION_LENGTH)} / {SESSION_LENGTH}
        </span>
      </div>
      <div className="tutor-progress" aria-hidden="true">
        <span style={{ width: `${(count / SESSION_LENGTH) * 100}%` }} />
      </div>

      {!served && busy && <p className="tutor-loading">Loading…</p>}
      {served && (
        <ItemView
          item={served.item}
          disabled={busy || Boolean(feedback)}
          speech={speech}
          onAnswer={answer}
          chosen={answered && feedback?.type === "answer" ? feedback.response : null}
          correctAnswer={answered ? answered.answer : null}
        />
      )}

      {error && <p className="auth-error" role="alert">{error}</p>}

      {feedback?.type === "answer" && (
        <div className={`tutor-feedback ${feedback.result.correct ? "is-right" : "is-wrong"}`} role="status">
          <p className="tutor-feedback-title">
            {feedback.result.correct ? `✅ ${CHEERS[count % CHEERS.length]}` : "❌ Not quite."}
          </p>
          {!feedback.result.correct && served?.item.kind !== "choice" && (
            <p>
              The answer is <strong>{feedback.result.answer}</strong>.
            </p>
          )}
          <p>{explanation ?? feedback.result.explain}</p>
          {!feedback.result.correct && !explanation && (
            <button type="button" className="tutor-reveal" onClick={explainMore} disabled={busy}>
              🧑‍🏫 Explain it to me
            </button>
          )}
          {feedback.result.justMastered && <p className="tutor-unlocked">🎉 You mastered <strong>{feedback.result.skillTitle}</strong>!</p>}
        </div>
      )}

      {feedback?.type === "write" && (
        <div className={`tutor-feedback ${feedback.result.passed ? "is-right" : "is-wrong"}`} role="status">
          <p className="tutor-feedback-title">
            {feedback.result.passed ? "✅ Good writing!" : "✏️ Nice try. Let's make it even better."}{" "}
            <span className="tutor-score">{feedback.result.score}%</span>
          </p>
          {feedback.result.praise && <p>👍 {feedback.result.praise}</p>}
          {feedback.result.nextStep && <p>🎯 {feedback.result.nextStep}</p>}
          {feedback.result.tips.length > 0 && (
            <ul>{feedback.result.tips.map((t) => <li key={t}>{t}</li>)}</ul>
          )}
          {feedback.result.improved && (
            <details>
              <summary>See it with corrections</summary>
              <p className="tutor-improved">{feedback.result.improved}</p>
            </details>
          )}
          {!feedback.result.aiChecked && <p className="tutor-note">Checked for length, capitals and full stops.</p>}
        </div>
      )}

      {feedback && (
        <button ref={nextRef} type="button" className="gz-btn gz-btn-primary tutor-next" onClick={next} disabled={busy}>
          {count >= SESSION_LENGTH ? "See my results" : "Next question →"}
        </button>
      )}

      {speech.supported && (
        <label className="tutor-autoread">
          <input type="checkbox" checked={speech.autoRead} onChange={(e) => speech.setAutoRead(e.target.checked)} /> Read questions aloud
        </label>
      )}
    </div>
  );
}
