"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * A rotating set of prompts, typed and untyped.
 *
 * The cadence is what makes this read as someone writing rather than as a ticker: characters
 * arrive at a slightly varied interval, the finished sentence is held long enough to be read
 * at reading speed, and deletion runs at roughly twice typing speed because nobody watches
 * their own backspacing.
 *
 * It is a demonstration, not an input. The real prompt box is `PromptComposer`, which is a
 * `<form>` with a Server Action behind it; this types into a facsimile and is hidden from
 * assistive technology, with the full set of examples exposed as static text instead —
 * a live region emitting one character at a time is unusable.
 */

const TYPE_MS = 42;
const TYPE_JITTER_MS = 38;
const DELETE_MS = 22;
const HOLD_MS = 2200;
const EMPTY_MS = 420;

export function Typewriter({
  phrases,
  className,
}: {
  phrases: readonly string[];
  className?: string;
}) {
  const still = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  const phrase = phrases[index % phrases.length] ?? "";

  useEffect(() => {
    if (still) {
      return;
    }

    const done = typed === phrase;
    const empty = typed === "";

    const delay = (() => {
      if (!deleting) {
        return done ? HOLD_MS : TYPE_MS + Math.random() * TYPE_JITTER_MS;
      }
      return empty ? EMPTY_MS : DELETE_MS;
    })();

    const timer = setTimeout(() => {
      if (!deleting) {
        if (done) {
          setDeleting(true);
          return;
        }
        // Sliced from the phrase rather than concatenated from a character, so a phrase
        // containing an emoji or an Arabic ligature is never cut through the middle of one.
        setTyped(phrase.slice(0, typed.length + 1));
        return;
      }

      if (empty) {
        setDeleting(false);
        setIndex((current) => (current + 1) % phrases.length);
        return;
      }
      setTyped(phrase.slice(0, typed.length - 1));
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [typed, deleting, phrase, phrases.length, still]);

  return (
    <span className={className} aria-hidden="true">
      {still ? phrase : typed}
      {!still && (
        <span className="bg-emerald animate-caret ms-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em]" />
      )}
    </span>
  );
}
