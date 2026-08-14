"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * What the model is doing, while it is doing it.
 *
 * A spinner says "wait"; this says what is being waited for, and the five lines are the five
 * things the API actually produces from one prompt — a theme, the page copy, the categories,
 * eight products, the saved store (architecture.md §10). It is a progress *indication*, not a
 * progress *report*: nothing streams back from the generator, so the steps advance on a
 * timer. The last one is therefore special — it never ticks itself off. It holds until the
 * Server Action returns, which is the only moment anything here knows to be true.
 *
 * Used twice. On the landing page it loops, as a demonstration. On the create page it is
 * driven by the form's own pending state, as the loading state.
 */

const STEPS = [
  "Understanding your idea",
  "Designing your brand",
  "Writing your storefront",
  "Generating products",
  "Optimising your store",
] as const;

/**
 * Deliberately uneven, and deliberately slowing.
 *
 * A constant interval reads as a fake, because real work does not arrive in metronome time.
 * These are also generous: generation takes tens of seconds, and a bar that races to the
 * final step in four is a bar that spends the rest of the wait looking broken.
 */
const STEP_MS = [1500, 2600, 3400, 4200] as const;
const LOOP_HOLD_MS = 2100;

export function GenerationProgress({
  running,
  loop = false,
  tone = "light",
  className,
}: {
  /** True while the real request is in flight. Ignored when `loop` is set. */
  running?: boolean;
  /** Cycle forever, for the marketing demonstration. */
  loop?: boolean;
  tone?: "light" | "dark";
  className?: string;
}) {
  const still = useReducedMotion() ?? false;
  const active = loop || running === true;
  const [reached, setReached] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!active) {
      setReached(0);
      setFinished(false);
      return;
    }

    if (finished) {
      if (!loop) {
        return;
      }
      const restart = setTimeout(() => {
        setReached(0);
        setFinished(false);
      }, LOOP_HOLD_MS);
      return () => {
        clearTimeout(restart);
      };
    }

    // The last step is the live one: on the real form it stays lit until the action resolves
    // and this component unmounts. Only the looping demonstration is allowed to finish it.
    if (reached >= STEPS.length - 1) {
      if (!loop) {
        return;
      }
      const done = setTimeout(() => {
        setFinished(true);
      }, 1800);
      return () => {
        clearTimeout(done);
      };
    }

    const next = setTimeout(() => {
      setReached((current) => current + 1);
    }, STEP_MS[reached] ?? 2600);
    return () => {
      clearTimeout(next);
    };
  }, [active, reached, finished, loop]);

  const dark = tone === "dark";

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 sm:p-6",
        dark
          ? "border-white/12 bg-white/[0.04] backdrop-blur-sm"
          : "border-line bg-card shadow-soft",
        className,
      )}
      // The real one is a loading state, so it announces itself. Politely: the whole point
      // is that the person can look away.
      role={loop ? undefined : "status"}
      aria-live={loop ? undefined : "polite"}
    >
      <div className="flex items-center gap-2">
        <Sparkles
          className={cn("size-4", dark ? "text-gold" : "text-emerald")}
          aria-hidden="true"
        />
        <span
          className={cn(
            "text-[11px] font-medium tracking-[0.16em] uppercase",
            dark ? "text-white/70" : "text-muted-foreground",
          )}
        >
          Dukkanify AI
        </span>
      </div>

      <ol className="mt-5 space-y-3.5">
        {STEPS.map((step, index) => {
          const done = finished || index < reached;
          const current = !finished && index === reached && active;

          return (
            <li key={step} className="flex items-center gap-3">
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-500",
                  done
                    ? dark
                      ? "border-gold/60 bg-gold/20 text-gold"
                      : "border-emerald/40 bg-emerald/10 text-emerald"
                    : current
                      ? dark
                        ? "border-white/40 text-white/80"
                        : "border-emerald/40 text-emerald"
                      : dark
                        ? "border-white/15 text-white/25"
                        : "border-line text-muted-foreground/40",
                )}
              >
                {done ? (
                  <Check className="size-3" aria-hidden="true" />
                ) : current && !still ? (
                  <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>

              <span
                className={cn(
                  "text-sm transition-colors duration-500",
                  done || current
                    ? dark
                      ? "text-white"
                      : "text-foreground"
                    : dark
                      ? "text-white/35"
                      : "text-muted-foreground/60",
                )}
              >
                {step}
              </span>

              {/* The one shimmering row. Its width tracks the text, so it reads as the line
                  being worked on rather than as a bar bolted to the side of it. */}
              {current && !still && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "ms-auto h-px w-10 rounded-full",
                    dark ? "bg-gold/50" : "bg-emerald/40",
                    "shimmer",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      <div
        className={cn(
          "mt-5 h-1 overflow-hidden rounded-full",
          dark ? "bg-white/10" : "bg-muted",
        )}
        aria-hidden="true"
      >
        <motion.div
          className={cn("h-full rounded-full", dark ? "bg-gold" : "bg-emerald")}
          initial={{ width: "0%" }}
          animate={{
            width: `${String(((finished ? STEPS.length : reached + 0.5) / STEPS.length) * 100)}%`,
          }}
          transition={{ duration: still ? 0 : 0.8, ease: "easeOut" }}
        />
      </div>

      <AnimatePresence>
        {finished && (
          <motion.p
            initial={still ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "mt-4 text-sm font-medium",
              dark ? "text-gold" : "text-emerald",
            )}
          >
            Your store is ready.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
