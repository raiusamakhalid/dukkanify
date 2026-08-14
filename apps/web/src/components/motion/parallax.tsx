"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useRef, type ReactNode } from "react";

/**
 * A decorative element that drifts against the scroll.
 *
 * Deliberately weak — `distance` defaults to 40 pixels across an entire viewport of scroll,
 * which is the difference between depth and a funfair. It is for gold discs, mashrabiya
 * panels and floating cards; nothing a person has to read or click goes inside one, because
 * an element that moves relative to the page is an element a pointer has to chase.
 *
 * `useScroll` with `offset` measures this element's own passage through the viewport rather
 * than the document's total scroll, so several of these on one page each move on their own
 * schedule instead of all snapping at the same document offsets.
 */
export function Parallax({
  children,
  distance = 40,
  className,
}: {
  children: ReactNode;
  /** Total travel in pixels across the element's full pass through the viewport. */
  distance?: number;
  className?: string;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  const still = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({
    target: anchor,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);

  return (
    <div ref={anchor} className={className} aria-hidden="true">
      {/* Spread rather than `style={still ? undefined : …}`: under
          `exactOptionalPropertyTypes` an explicit `undefined` is not the same as an absent
          prop, and Motion's `style` does not accept one. */}
      <motion.div {...(still ? {} : { style: { y } })}>{children}</motion.div>
    </div>
  );
}
