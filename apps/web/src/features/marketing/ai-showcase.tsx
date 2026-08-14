import { ArrowRight, Quote } from "lucide-react";
import { BrowserFrame } from "@/components/browser-frame";
import { GenerationProgress } from "@/components/generation-progress";
import { Reveal } from "@/components/motion/reveal";
import { Container, SectionHeader } from "./section";
import { AL_NOOR } from "./demo-stores";
import { StorePreview } from "./store-preview";

/**
 * The transformation, shown rather than described.
 *
 * The section is one sentence on the left and the shop it produced on the right, with the
 * five things the model does in between — which is the entire product in one screen. It is
 * set on deep emerald because it is the page's thesis and nothing either side of it is
 * allowed to compete.
 *
 * The prompt shown is `AL_NOOR.prompt` and the storefront is `AL_NOOR`, from the same
 * object: the sentence and the shop cannot drift apart, because they are the same record.
 */
export function AiShowcase() {
  return (
    <section
      id="showcase"
      aria-labelledby="showcase-title"
      className="bg-emerald-deep bg-aurora-dark relative isolate overflow-hidden py-24 sm:py-32 lg:py-36"
    >
      <div
        aria-hidden="true"
        className="rule-gold absolute inset-x-0 top-0 h-px opacity-60"
      />

      <Container>
        <SectionHeader
          id="showcase-title"
          eyebrow="How it actually works"
          title="From one sentence to a complete store."
          lede="No template to start from and nothing to undo afterwards. The palette, the type scale, the headline, the categories and the catalogue all come out of the same brief."
          tone="dark"
          align="center"
        />

        <div className="mt-16 grid items-center gap-10 lg:mt-20 lg:grid-cols-[minmax(0,0.82fr)_auto_minmax(0,1.5fr)] lg:gap-8 xl:gap-12">
          <div className="space-y-6">
            <Reveal direction="start">
              <figure className="border-gold/25 bg-white/[0.04] rounded-2xl border p-6 backdrop-blur-sm">
                <Quote
                  className="text-gold/70 size-5 rtl:-scale-x-100"
                  aria-hidden="true"
                />
                <blockquote className="font-heading text-ivory mt-4 text-xl leading-snug sm:text-2xl">
                  “{AL_NOOR.prompt}”
                </blockquote>
                <figcaption className="text-ivory/50 mt-4 text-xs tracking-wide uppercase">
                  What the shop owner typed
                </figcaption>
              </figure>
            </Reveal>

            <Reveal direction="start" delay={0.12}>
              <GenerationProgress loop tone="dark" />
            </Reveal>
          </div>

          {/* The arrow between the two halves. Horizontal on a wide screen, rotated a
              quarter turn on a narrow one, so the reading order it describes is always the
              one the layout is actually using. */}
          <Reveal direction="none" delay={0.2} className="flex justify-center">
            <span
              aria-hidden="true"
              className="border-gold/30 bg-gold/10 text-gold grid size-12 place-items-center rounded-full border lg:size-14"
            >
              <ArrowRight className="size-5 rotate-90 lg:rotate-0 rtl:-scale-x-100" />
            </span>
          </Reveal>

          <Reveal direction="end" delay={0.1}>
            <BrowserFrame url="alnoor.dukkanify.store" tone="dark">
              <StorePreview store={AL_NOOR} />
            </BrowserFrame>
            <p className="text-ivory/45 mt-4 text-center text-xs">
              Theme, hero, categories, eight products, About and Contact — saved
              to the owner&rsquo;s account.
            </p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
