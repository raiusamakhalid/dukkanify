"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

/**
 * The page's entire animation vocabulary, in one file.
 *
 * Two rules hold it together. Everything moves on `transform` and `opacity` only — nothing
 * here can trigger layout, so a section revealing while another is still on screen costs the
 * compositor and nothing else. And everything asks `useReducedMotion` first: with the
 * preference set, the same components render at their final position with no transition, so
 * a page that animates and a page that does not are the *same* page.
 *
 * The CSS in `globals.css` already neutralises `animation` and `transition` under that
 * media query, but Motion animates through inline style updates, which no stylesheet can
 * reach. Both halves are needed.
 */

/** The house distance. Far enough to read as arrival, short enough not to read as a slide. */
const TRAVEL = 28;

export type RevealDirection = "up" | "down" | "start" | "end" | "none";

function offsetFor(direction: RevealDirection): { x: number; y: number } {
  switch (direction) {
    case "up":
      return { x: 0, y: TRAVEL };
    case "down":
      return { x: 0, y: -TRAVEL };
    // Physical, and deliberately so: `x` is a transform, and a transform has no logical
    // axis. The callers that use these are decorative compositions rather than reading
    // order, and an Arabic page mirrors the layout underneath them either way.
    case "start":
      return { x: -TRAVEL, y: 0 };
    case "end":
      return { x: TRAVEL, y: 0 };
    case "none":
      return { x: 0, y: 0 };
  }
}

/**
 * One element arriving as it scrolls into view.
 *
 * `once` is deliberately the default: an element that re-animates every time it re-enters
 * the viewport turns a scroll back up the page into a light show.
 */
export function Reveal({
  children,
  direction = "up",
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  direction?: RevealDirection;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "span";
}) {
  const still = useReducedMotion() ?? false;
  const offset = offsetFor(direction);
  const Component = motion[as];

  return (
    <Component
      className={className}
      initial={still ? false : { opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      // A negative bottom margin means "start when it is properly on screen", not when one
      // pixel of it has crossed the fold — otherwise a tall section animates above the fold
      // and the reader never sees it happen.
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Component>
  );
}

/**
 * A set of siblings arriving one after another.
 *
 * The stagger is declared on the parent and inherited, rather than each child being handed
 * its own `delay` — which is what stops a list of six from needing six hand-counted numbers
 * that go wrong the moment a seventh is added.
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.09,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  as?: "div" | "ul" | "ol" | "section";
}) {
  const Component = motion[as];

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      variants={{
        hidden: {},
        shown: {
          transition: { staggerChildren: stagger, delayChildren: delay },
        },
      }}
    >
      {children}
    </Component>
  );
}

const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: TRAVEL },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const STILL_VARIANTS: Variants = {
  hidden: { opacity: 1 },
  shown: { opacity: 1 },
};

/** A child of `RevealGroup`. Takes its timing from the parent, never from a prop. */
export function RevealItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  const still = useReducedMotion() ?? false;
  const Component = motion[as];

  return (
    <Component
      className={className}
      variants={still ? STILL_VARIANTS : ITEM_VARIANTS}
    >
      {children}
    </Component>
  );
}
