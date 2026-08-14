import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

/**
 * The landing page's rhythm, written once.
 *
 * Ten sections that each chose their own measure, padding and heading size is how a long
 * marketing page starts feeling assembled rather than designed. Everything below is the
 * page's only vocabulary for that: one container width, one vertical step, one heading
 * scale. A section that needs to break the rhythm — the dark call to action — sets its own
 * background and still uses `Container` inside it.
 */

/** 1280px of content, and the gutters that keep it off the edge of a phone. */
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1280px] px-6 sm:px-8 lg:px-10",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Section({
  id,
  children,
  className,
  /** `tight` for sections that follow one they belong to, like the proof strip under the hero. */
  space = "default",
  labelledBy,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  space?: "default" | "tight";
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        "relative",
        space === "tight" ? "py-16 sm:py-20" : "py-24 sm:py-32 lg:py-36",
        className,
      )}
    >
      <Container>{children}</Container>
    </section>
  );
}

/**
 * The small tracked line above a heading.
 *
 * A `<p>` rather than a heading level, on purpose: it is a label for the section, not a
 * rung in the document outline, and a screen reader walking the headings should hear the
 * sentence, not "AI STORE BUILDER".
 */
export function Eyebrow({
  children,
  tone = "emerald",
  className,
}: {
  children: ReactNode;
  tone?: "emerald" | "gold";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase",
        tone === "gold" ? "text-gold" : "text-emerald",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-px w-6",
          tone === "gold" ? "bg-gold/60" : "bg-emerald/40",
        )}
      />
      {children}
    </p>
  );
}

/**
 * A section's opening block: eyebrow, heading, and a line of lede beneath it.
 *
 * `id` is required and wired to the section's `aria-labelledby` at every call site, so ten
 * sections in a row are ten named regions rather than ten anonymous ones.
 */
export function SectionHeader({
  id,
  eyebrow,
  title,
  lede,
  tone = "light",
  align = "start",
  className,
}: {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  tone?: "light" | "dark";
  align?: "start" | "center";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl",
        className,
      )}
    >
      {eyebrow !== undefined && (
        <Eyebrow tone={tone === "dark" ? "gold" : "emerald"}>{eyebrow}</Eyebrow>
      )}

      <h2
        id={id}
        className={cn(
          "mt-5 text-3xl font-semibold sm:text-4xl lg:text-[2.75rem]",
          tone === "dark" ? "text-ivory" : "text-foreground",
        )}
      >
        {title}
      </h2>

      {lede !== undefined && (
        <p
          className={cn(
            "mt-5 text-lg leading-relaxed",
            tone === "dark" ? "text-ivory/65" : "text-muted-foreground",
          )}
        >
          {lede}
        </p>
      )}
    </Reveal>
  );
}
