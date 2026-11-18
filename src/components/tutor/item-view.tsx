"use client";

import { useEffect, useState } from "react";
import type { PublicItem } from "@/lib/tutor/types";

/** Renders one question and collects the learner's answer. */
export function ItemView({
  item,
  disabled,
  speech,
  onAnswer,
  chosen,
  correctAnswer,
}: {
  item: PublicItem;
  disabled: boolean;
  speech: { supported: boolean; speak: (t?: string) => void };
  onAnswer: (response: string) => void;
  /** After answering: what the learner chose, and the right answer. */
  chosen?: string | null;
  correctAnswer?: string | null;
}) {
  const [text, setText] = useState("");
  const [placed, setPlaced] = useState<number[]>([]);
  const [showWord, setShowWord] = useState(false);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const hearOnly = item.prompt.startsWith("Listen") && !item.visual && item.kind !== "write";

  useEffect(() => {
    // New question: clear the previous answer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText("");
    setPlaced([]);
    setShowWord(false);
  }, [item]);

  return (
    <div className="tutor-item">
      {item.passage && (
        <div className="tutor-passage">
          {item.passage.split("\n\n").map((para, i) =>
            i === 0 ? <h3 key={i}>{para}</h3> : <p key={i}>{para}</p>,
          )}
          {speech.supported && (
            <button type="button" className="tutor-listen" onClick={() => speech.speak(item.passage!.split("\n\n").slice(1).join(" "))}>
              🔊 Read the story to me
            </button>
          )}
        </div>
      )}

      <div className="tutor-prompt">
        <p>{item.prompt}</p>
        {speech.supported && item.speak && (
          <button type="button" className="tutor-listen" aria-label="Listen" onClick={() => speech.speak(item.speak)}>
            🔊 Listen
          </button>
        )}
      </div>

      {item.visual && <div className={`tutor-visual${item.visual.length > 14 ? " tutor-visual-small" : ""}`} aria-hidden={/\p{Extended_Pictographic}/u.test(item.visual) ? undefined : true}>{item.visual}</div>}

      {hearOnly && (!speech.supported || showWord) && item.speak && <div className="tutor-visual">{item.speak}</div>}
      {hearOnly && speech.supported && !showWord && (
        <button type="button" className="tutor-reveal" onClick={() => setShowWord(true)}>
          Can&rsquo;t hear it? Show the word
        </button>
      )}

      {item.kind === "choice" && (
        <div className={`tutor-choices${(item.choices ?? []).every((c) => c.length <= 4) ? " tutor-choices-grid" : ""}`}>
          {(item.choices ?? []).map((c) => {
            const state =
              correctAnswer == null ? "" : c === correctAnswer ? " is-right" : c === chosen ? " is-wrong" : " is-dim";
            return (
              <button key={c} type="button" className={`tutor-choice${state}`} disabled={disabled} onClick={() => onAnswer(c)}>
                {c}
              </button>
            );
          })}
        </div>
      )}

      {item.kind === "input" && (
        <form
          className="tutor-input-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) onAnswer(text.trim());
          }}
        >
          <input
            className="tutor-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            inputMode={item.inputMode === "numeric" ? "decimal" : "text"}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            aria-label="Your answer"
            placeholder={item.inputMode === "numeric" ? "Type a number" : "Type the word"}
            disabled={disabled}
            autoFocus
          />
          <button type="submit" className="gz-btn gz-btn-primary" disabled={disabled || !text.trim()}>
            Check
          </button>
        </form>
      )}

      {item.kind === "order" && item.tiles && (
        <div className="tutor-order">
          <div className="tutor-order-line" aria-label="Your sentence">
            {placed.length === 0 && <span className="tutor-order-hint">Tap the words below…</span>}
            {placed.map((i, pos) => (
              <button key={`${i}-${pos}`} type="button" className="tutor-tile is-placed" disabled={disabled} onClick={() => setPlaced(placed.filter((_, p) => p !== pos))}>
                {item.tiles![i]}
              </button>
            ))}
          </div>
          <div className="tutor-order-bank">
            {item.tiles.map((t, i) => (
              <button key={i} type="button" className="tutor-tile" disabled={disabled || placed.includes(i)} onClick={() => setPlaced([...placed, i])}>
                {t}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="gz-btn gz-btn-primary"
            disabled={disabled || placed.length !== item.tiles.length}
            onClick={() => onAnswer(placed.map((i) => item.tiles![i]).join(" "))}
          >
            Check
          </button>
        </div>
      )}

      {item.kind === "write" && (
        <form
          className="tutor-write"
          onSubmit={(e) => {
            e.preventDefault();
            if (words >= 2) onAnswer(text);
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={item.minWords && item.minWords > 10 ? 8 : 3}
            maxLength={4000}
            placeholder="Write here…"
            aria-label="Your writing"
            disabled={disabled}
          />
          <p className="tutor-wordcount">
            {words} word{words === 1 ? "" : "s"}
            {item.minWords ? ` · aim for at least ${item.minWords}` : ""}
          </p>
          <button type="submit" className="gz-btn gz-btn-primary" disabled={disabled || words < 2}>
            Send my writing
          </button>
        </form>
      )}
    </div>
  );
}
