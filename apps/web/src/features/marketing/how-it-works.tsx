import { Check, Globe, PenLine, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { BrowserFrame } from "@/components/browser-frame";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Section, SectionHeader } from "./section";
import { AL_NOOR } from "./demo-stores";
import { StorePreview } from "./store-preview";

/**
 * Three steps, each with the interface it actually happens in.
 *
 * The reason the visuals differ rather than repeating one screenshot three times: the steps
 * are not three views of the same thing. Step one is a text box, step two is a set of
 * decisions being made, step three is a shop. Illustrating them identically would be the
 * quickest way to make a three-step section look like filler.
 */

const STEPS = [
  {
    number: "01",
    icon: PenLine,
    title: "Describe your idea",
    body: "One sentence about what you sell, in English or Arabic. A brief, not a form — there is nothing else to fill in.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Let the AI build",
    body: "A palette and type scale, a hero, curated categories, eight priced products, and the About and Contact pages every shop needs.",
  },
  {
    number: "03",
    icon: Globe,
    title: "Edit it and publish",
    body: "Change any headline, colour or description in place, then publish to a public link. Nothing is a template you have to undo.",
  },
] as const;

export function HowItWorks() {
  return (
    <Section id="how-it-works" labelledBy="how-title">
      <SectionHeader
        id="how-title"
        eyebrow="How it works"
        title="Three steps, about a minute."
        lede="No theme to pick, no blocks to drag, no placeholder text to delete afterwards."
      />

      <div className="relative mt-16 lg:mt-20">
        {/* The line joining the three. Sits behind the numbers at exactly their height and
            only exists on the breakpoint where the steps are actually in a row. */}
        <div
          aria-hidden="true"
          className="via-line absolute inset-x-[16%] top-7 hidden h-px bg-gradient-to-r from-transparent to-transparent lg:block"
        />

        <RevealGroup
          as="ol"
          className="grid gap-12 lg:grid-cols-3 lg:gap-8 xl:gap-12"
          stagger={0.14}
        >
          {STEPS.map((step, index) => (
            <RevealItem as="li" key={step.number} className="relative">
              <div className="flex items-center gap-4">
                <span className="border-line bg-card text-emerald shadow-soft relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl border">
                  <step.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="font-heading text-emerald/15 text-5xl font-semibold tabular-nums">
                  {step.number}
                </span>
              </div>

              <h3 className="mt-7 text-2xl font-semibold">{step.title}</h3>
              <p className="text-muted-foreground mt-3 leading-relaxed">
                {step.body}
              </p>

              <div className="mt-8">
                {index === 0 && <PromptVisual />}
                {index === 1 && <BuildVisual />}
                {index === 2 && <LaunchVisual />}
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </Section>
  );
}

/** A frame the three step visuals share, so they line up at one height and one edge. */
function StepVisual({ children }: { children: ReactNode }) {
  return (
    <div className="border-line bg-card shadow-soft h-56 overflow-hidden rounded-2xl border">
      {children}
    </div>
  );
}

function PromptVisual() {
  return (
    <StepVisual>
      <div className="flex h-full flex-col justify-center p-6">
        <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">
          Your brief
        </span>
        <p className="font-heading text-foreground mt-3 text-lg leading-snug">
          “Create a luxury perfume store for UAE customers.”
        </p>
        <div className="mt-5 flex items-center gap-2">
          <span className="bg-emerald text-ivory rounded-lg px-3 py-1.5 text-[11px] font-medium">
            Generate My Store
          </span>
          <span className="text-muted-foreground text-[10px]">
            47 / 500 characters
          </span>
        </div>
      </div>
    </StepVisual>
  );
}

/**
 * The decisions being made — the palette the model picked, the faces it paired, and the
 * sections it emitted. Swatches come from `AL_NOOR.theme`, so this cannot show a colour the
 * showcase beside it does not use.
 */
function BuildVisual() {
  const { colors, fonts } = AL_NOOR.theme;

  return (
    <StepVisual>
      <div className="flex h-full flex-col justify-center gap-4 p-6">
        <div>
          <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">
            Palette
          </span>
          <div className="mt-2.5 flex gap-2">
            {Object.entries(colors).map(([token, hex]) => (
              <span
                key={token}
                className="ring-line size-7 rounded-lg ring-1"
                style={{ background: hex }}
                title={token}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">
            Typeface
          </span>
          <p className="text-foreground mt-1.5 text-sm">
            {fonts.display} · {fonts.body}
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {["Hero", "Categories", "Products", "About", "Contact"].map(
            (section) => (
              <li
                key={section}
                className="text-muted-foreground flex items-center gap-1.5 text-xs"
              >
                <Check className="text-emerald size-3" aria-hidden="true" />
                {section}
              </li>
            ),
          )}
        </ul>
      </div>
    </StepVisual>
  );
}

function LaunchVisual() {
  return (
    <div className="relative">
      <BrowserFrame url="alnoor.dukkanify.store" className="h-56">
        {/* Scaled down and clipped rather than re-authored at a smaller size: it is the same
            component the hero shows at full size, so the two cannot disagree. */}
        <div className="h-full origin-top scale-[0.62] rtl:origin-top">
          <StorePreview store={AL_NOOR} className="w-[161%]" />
        </div>
      </BrowserFrame>

      <span className="bg-emerald text-ivory shadow-soft absolute -bottom-3 end-4 rounded-full px-3 py-1.5 text-[11px] font-semibold">
        Published
      </span>
    </div>
  );
}
