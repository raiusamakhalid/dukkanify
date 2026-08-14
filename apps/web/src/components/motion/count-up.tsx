"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * A number that counts up the first time it is scrolled to.
 *
 * It animates React state rather than writing to the DOM node directly, which is the slower
 * of the two options and the correct one here: the value is *text*, a screen reader is
 * reading it, and a number mutated behind React's back is a number the accessibility tree
 * disagrees with. There are at most four of these on a page and each runs for well under a
 * second, so the render cost is not the constraint.
 *
 * `aria-hidden` on the animating span with the final value in a visually hidden sibling
 * would be the alternative; instead the whole element carries the settled figure as its
 * accessible name, so assistive technology hears "10,000 stores created" once rather than
 * forty times on the way there.
 */
export function CountUp({
  to,
  suffix = "",
  decimals = 0,
  duration = 1.6,
  className,
}: {
  to: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const inView = useInView(anchor, { once: true, amount: 0.6 });
  const still = useReducedMotion() ?? false;
  const [value, setValue] = useState(still ? to : 0);

  useEffect(() => {
    if (!inView || still) {
      return;
    }

    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        setValue(latest);
      },
    });

    // Cancelled rather than left running: the component can unmount mid-count when a route
    // changes under it, and an `onUpdate` calling `setValue` after that is a warning in
    // development and a leak in production.
    return () => {
      controls.stop();
    };
  }, [inView, still, to, duration]);

  const settled = format(to, decimals) + suffix;

  return (
    <span
      ref={anchor}
      className={className}
      // The tabular figures matter more than they look: without them the number's width
      // changes on almost every frame and the label beside it jitters.
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      <span aria-hidden="true">
        {format(value, decimals)}
        {suffix}
      </span>
      <span className="sr-only">{settled}</span>
    </span>
  );
}

function format(value: number, decimals: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
