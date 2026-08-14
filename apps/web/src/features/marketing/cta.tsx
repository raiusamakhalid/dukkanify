import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Mashrabiya } from "@/components/mashrabiya";
import { Reveal } from "@/components/motion/reveal";
import { Container } from "./section";

/**
 * The last thing on the page, and the only place it asks twice.
 *
 * Deep emerald, one heading, one button. The mashrabiya returns here at a much lower
 * opacity than in the hero — a bookend rather than a second billing — and the gold appears
 * as a single hairline across the top edge, which is the whole gold budget for this section.
 */
export function FinalCta() {
  return (
    <section
      aria-labelledby="cta-title"
      className="bg-emerald-deep relative isolate overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="rule-gold absolute inset-x-0 top-0 h-px"
      />

      <div
        className="text-gold pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [mask-image:radial-gradient(60%_60%_at_50%_50%,black,transparent)]"
        aria-hidden="true"
      >
        <Mashrabiya patternId="mashrabiya-cta" className="h-full w-full" />
      </div>

      <div
        aria-hidden="true"
        className="bg-gold/10 pointer-events-none absolute -bottom-40 start-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full blur-[130px]"
      />

      <Container>
        <div className="py-24 text-center sm:py-32 lg:py-40">
          <Reveal>
            <span className="border-gold/30 text-gold inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Free to try — one sentence to start
            </span>

            <h2
              id="cta-title"
              className="text-ivory mx-auto mt-8 max-w-3xl text-4xl font-semibold sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]"
            >
              Your store starts with a sentence.
            </h2>

            <p className="text-ivory/65 mx-auto mt-6 max-w-xl text-lg leading-relaxed">
              Tell Dukkanify what you want to build and let the AI handle the
              theme, the copy and the catalogue.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="bg-gold text-emerald-deep focus-visible:ring-gold group inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-base font-semibold shadow-floating transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-deep focus-visible:outline-none"
              >
                Start Building with AI
                <ArrowRight
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
                  aria-hidden="true"
                />
              </Link>

              <Link
                href="#showcase"
                className="text-ivory/80 hover:text-ivory hover:border-ivory/40 focus-visible:ring-ivory inline-flex items-center justify-center rounded-xl border border-white/20 px-8 py-4 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                See it build one
              </Link>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
