"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Languages, Palette, Sparkles, Store } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Mashrabiya } from "@/components/mashrabiya";
import { Parallax } from "@/components/motion/parallax";
import { Typewriter } from "@/components/motion/typewriter";
import { BrowserFrame } from "@/components/browser-frame";
import { cn } from "@/lib/utils";
import { AL_NOOR } from "./demo-stores";
import { Container } from "./section";
import { StorePreview } from "./store-preview";

/**
 * The first screen.
 *
 * Two columns and one claim: a sentence goes in on the left, a shop comes out on the right.
 * The composition is doing the explaining, so the copy does not have to — which is why the
 * prompt card and the storefront are the two largest objects on the page and the paragraph
 * between them is three lines long.
 *
 * Everything arrives on a stagger, in the order a reader's eye takes it: heading, sentence,
 * actions, the prompt they would type, the shop it produces, and last the small facts
 * floating around it. Under `prefers-reduced-motion` all six land at once, in place.
 */

const SIGN_UP_HREF = "/signup";

/** The prompts the card types. Each one is a shop this generator can actually build. */
const PROMPTS = [
  "Create a luxury perfume store for UAE customers.",
  "Build a modern abaya label for Dubai.",
  "Create an Arabic oud and bukhoor store.",
  "Build a premium jewellery store for the Gold Souk.",
] as const;

export function Hero() {
  const still = useReducedMotion() ?? false;

  /** The stagger from the brief: 0, 150, 300, 450, 600, 750ms. */
  const step = (index: number) => ({
    initial: still ? false : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.7,
      delay: still ? 0 : index * 0.15,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  });

  return (
    <section className="bg-aurora relative isolate overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28 lg:min-h-[88vh] lg:pt-44 lg:pb-32">
      <HeroBackdrop />

      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] lg:gap-14 xl:gap-20">
          {/* No `max-w` on the column itself: at 4.25rem the heading needs the whole column
              or "with one sentence" breaks across three lines. The paragraph carries its own
              measure instead, which is the only thing here that needs one. */}
          <div>
            <motion.div {...step(0)}>
              <span className="border-emerald/15 bg-card/70 text-emerald inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur-sm">
                <Sparkles className="size-3.5" aria-hidden="true" />
                AI store builder, built for the Gulf
              </span>
            </motion.div>

            <motion.h1
              {...step(0)}
              // Capped at 3.75rem rather than 4.25: the container maxes out at 1280px, so
              // this column never grows past ~625px however wide the window gets, and the
              // larger size put "sentence." on a line of its own at every desktop size.
              className="mt-7 text-[2.75rem] leading-[1.02] font-semibold sm:text-6xl lg:text-[3.5rem] xl:text-[3.75rem]"
            >
              {/* Two lines by construction rather than wherever the measure happens to
                  break: the sentence has two halves, and a hero that re-breaks at every
                  width reads like an accident at one of them. */}
              <span className="block">Build your store</span>
              <span className="text-gradient-emerald block">
                with one sentence.
              </span>
            </motion.h1>

            <motion.p
              {...step(1)}
              className="text-muted-foreground mt-7 max-w-xl text-lg leading-relaxed sm:text-xl"
            >
              Describe the shop you want. Dukkanify designs the theme, writes
              the copy, fills the catalogue and saves the whole storefront —
              ready to edit, in English or Arabic.
            </motion.p>

            <motion.div
              {...step(2)}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Link
                href={SIGN_UP_HREF}
                className="bg-emerald text-ivory hover:bg-emerald-deep focus-visible:ring-ring group inline-flex items-center justify-center gap-2 rounded-xl px-7 py-4 text-base font-medium shadow-lifted transition-all duration-300 hover:-translate-y-0.5 hover:shadow-floating focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Create Store with AI
                <ArrowRight
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
                  aria-hidden="true"
                />
              </Link>

              <Link
                href="#templates"
                className="border-input text-foreground hover:bg-secondary focus-visible:ring-ring inline-flex items-center justify-center gap-2 rounded-xl border px-7 py-4 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                Explore Demo Stores
              </Link>
            </motion.div>

            <motion.div {...step(3)} className="mt-10">
              <PromptCard />
            </motion.div>
          </div>

          <motion.div {...step(4)} className="relative">
            <HeroStorePreview />
            <HeroFloatingCards delay={still ? 0 : 0.75} />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

/**
 * The atmosphere behind the hero: one mashrabiya screen, two soft discs.
 *
 * The lattice is masked to the top corner so it reads as a carved screen catching light
 * rather than as wallpaper, and it is the only place on the site the motif appears at full
 * size — the logo carries one tile of it, and nothing else does.
 */
function HeroBackdrop() {
  return (
    <>
      <div
        className="text-emerald pointer-events-none absolute inset-0 -z-10 opacity-[0.13] [mask-image:radial-gradient(65%_55%_at_75%_0%,black,transparent)]"
        aria-hidden="true"
      >
        <Mashrabiya className="h-full w-full" />
      </div>

      <Parallax
        distance={30}
        className="pointer-events-none absolute -top-24 -end-24 -z-10 hidden lg:block"
      >
        <div className="bg-gold/25 animate-halo size-[26rem] rounded-full blur-[110px]" />
      </Parallax>

      <Parallax
        distance={-24}
        className="pointer-events-none absolute -bottom-32 -start-32 -z-10"
      >
        <div className="bg-emerald/15 size-[24rem] rounded-full blur-[120px]" />
      </Parallax>
    </>
  );
}

/**
 * The prompt box, typing itself.
 *
 * It is a facsimile and says so by behaving like one: nothing here is a field, the button is
 * a link to sign-in, and the animated text is hidden from assistive technology with the four
 * example prompts exposed as static text below it. The real composer — a `<form>` with a
 * Server Action — is one route away, and duplicating it here would mean an unauthenticated
 * generate endpoint that does not exist.
 */
function PromptCard() {
  return (
    <div className="border-line bg-card/85 shadow-lifted relative rounded-2xl border p-5 backdrop-blur-md sm:p-6">
      <div
        aria-hidden="true"
        className="from-gold/40 absolute inset-x-6 -top-px h-px bg-gradient-to-r via-transparent to-transparent"
      />

      <div className="flex items-center gap-2">
        <Sparkles className="text-gold size-4" aria-hidden="true" />
        <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
          AI Store Builder
        </span>
      </div>

      <p className="text-muted-foreground mt-4 text-xs">
        What do you want to sell?
      </p>

      <p className="font-heading text-foreground mt-2 min-h-[3.5rem] text-lg leading-snug sm:min-h-[3.75rem] sm:text-xl">
        <Typewriter phrases={PROMPTS} />
        <span className="sr-only">For example: {PROMPTS.join(" Or: ")}</span>
      </p>

      <div className="mt-5 flex items-center justify-between gap-4">
        <span className="text-muted-foreground text-[11px]">
          English or Arabic — the shop follows your language.
        </span>

        <Link
          href={SIGN_UP_HREF}
          className="bg-emerald text-ivory hover:bg-emerald-deep focus-visible:ring-ring group inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          Generate Store
          <Sparkles
            className="size-3.5 transition-transform duration-300 group-hover:rotate-12"
            aria-hidden="true"
          />
        </Link>
      </div>
    </div>
  );
}

function HeroStorePreview() {
  return (
    <div className="relative">
      <BrowserFrame
        url="alnoor.dukkanify.store"
        className="ring-1 ring-emerald/5"
      >
        <StorePreview store={AL_NOOR} />
      </BrowserFrame>

      <span className="border-gold/40 bg-card text-emerald shadow-soft absolute -top-3 start-5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold">
        <Sparkles className="size-3" aria-hidden="true" />
        AI Generated
      </span>
    </div>
  );
}

/**
 * The three facts orbiting the preview.
 *
 * They float on a long, offset cycle so the group never pulses in unison, and they are
 * hidden below `lg` rather than reflowed: on a phone they would either cover the storefront
 * they are annotating or become a third list nobody asked for. Every one of them is a
 * property of what the generator actually emits.
 */
function HeroFloatingCards({ delay }: { delay: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 hidden lg:block"
      aria-hidden="true"
    >
      {/* Positioned to hang off the frame over its *photographs*, never over its text. A
          chip parked on a product shot reads as an annotation; the same chip halfway through
          a headline reads as a rendering bug, which is what the first pass at this was. */}
      <FloatingCard
        className="bottom-[20%] -start-8 2xl:-start-14"
        delay={delay}
        duration="7s"
        icon={<Store className="size-3.5" />}
      >
        8 products generated
      </FloatingCard>

      <FloatingCard
        className="top-[42%] -end-4 2xl:-end-14"
        delay={delay + 0.12}
        duration="8.5s"
        icon={<Palette className="text-gold size-3.5" />}
      >
        Theme ready
      </FloatingCard>

      <FloatingCard
        className="bottom-[20%] -end-4 2xl:-end-12"
        delay={delay + 0.24}
        duration="9.5s"
        icon={<Languages className="size-3.5" />}
      >
        Arabic &amp; RTL
      </FloatingCard>
    </div>
  );
}

function FloatingCard({
  children,
  icon,
  className,
  delay,
  duration,
}: {
  children: ReactNode;
  icon: ReactNode;
  className?: string;
  delay: number;
  duration: string;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn("absolute", className)}
    >
      <span
        className="border-line bg-card/90 text-foreground shadow-lifted animate-float flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium backdrop-blur-md"
        style={{ animationDuration: duration }}
      >
        <span className="text-emerald">{icon}</span>
        {children}
      </span>
    </motion.span>
  );
}
