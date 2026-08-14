import { Check } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";
import { IMAGERY } from "@/lib/imagery";
import { cn } from "@/lib/utils";
import { EditorShowcase } from "./editor-showcase";
import { Eyebrow, Section, SectionHeader } from "./section";
import { ThemeShowcase } from "./theme-showcase";

/**
 * Three claims, each with the thing it is claiming about beside it.
 *
 * Not a grid of icon cards. An icon card can say "AI theming" and prove nothing; a live
 * theme switcher repainting a storefront proves it in two seconds, and takes the same
 * vertical space three cards would. The rows alternate side so the eye has to cross the
 * page, which is what stops a long section from reading as one column of text.
 */
export function Features() {
  return (
    <Section id="features" labelledBy="features-title">
      <SectionHeader
        id="features-title"
        eyebrow="What you get"
        title="Not a template with your name on it."
        lede="Every part of the shop is generated from your brief and editable afterwards — the palette, the words, the catalogue and the pages."
      />

      <div className="mt-20 space-y-24 sm:mt-24 sm:space-y-32">
        <FeatureRow
          eyebrow="Generation"
          title={
            <>
              AI that understands
              <br className="hidden sm:block" /> your business
            </>
          }
          body="Dukkanify reads one sentence and decides everything a shop needs to exist: what it is called, what it looks like, what it sells and what it says about itself."
          bullets={[
            "Brand name, tagline and voice",
            "Palette, typography and spacing",
            "Hero, categories and eight priced products",
            "About and Contact pages, written",
            "Arabic or English, chosen by your prompt",
          ]}
          visual={<GenerationCollage />}
        />

        <FeatureRow
          reversed
          eyebrow="Theming"
          title={
            <>
              A theme, not a skin
              <br className="hidden sm:block" /> painted on top
            </>
          }
          body="Colour, radius and typeface are tokens on the storefront itself. Change one and every section repaints at once — because no section knows what colour it is."
          bullets={[
            "Six colour tokens, one radius, two typefaces",
            "Both display faces carry Arabic",
            "Applied as CSS custom properties, not a rebuild",
          ]}
          visual={<ThemeShowcase />}
        />

        <FeatureRow
          eyebrow="Editing"
          title={
            <>
              Edit it exactly
              <br className="hidden sm:block" /> where you see it
            </>
          }
          body="Choose a section on the canvas and its own fields open beside it. Changes appear on the storefront as you type and are saved when you say so."
          bullets={[
            "Click a section, edit its real fields",
            "Optimistic canvas — and a real rollback when a save is refused",
            "Colour pickers that repaint the whole shop live",
          ]}
          visual={<EditorShowcase />}
        />
      </div>
    </Section>
  );
}

function FeatureRow({
  eyebrow,
  title,
  body,
  bullets,
  visual,
  reversed = false,
}: {
  eyebrow: string;
  title: ReactNode;
  body: string;
  bullets: readonly string[];
  visual: ReactNode;
  reversed?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <Reveal
        direction={reversed ? "end" : "start"}
        className={cn(reversed && "lg:order-2")}
      >
        <Eyebrow>{eyebrow}</Eyebrow>

        <h3 className="mt-5 text-3xl font-semibold sm:text-[2.5rem] sm:leading-[1.1]">
          {title}
        </h3>

        <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
          {body}
        </p>

        <ul className="mt-8 space-y-3">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-3">
              <span className="bg-emerald/10 text-emerald mt-0.5 grid size-5 shrink-0 place-items-center rounded-full">
                <Check className="size-3" aria-hidden="true" />
              </span>
              <span className="text-foreground/85 text-[15px]">{bullet}</span>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal
        direction={reversed ? "start" : "end"}
        delay={0.1}
        className={cn("min-w-0", reversed && "lg:order-1")}
      >
        {visual}
      </Reveal>
    </div>
  );
}

/**
 * Two photographs, offset, with the theme the generator picked floating over them.
 *
 * The overlap is what stops it being a stock photo in a box: the second image and the card
 * cross the first one's edge, so the group reads as an arrangement rather than an
 * illustration slot that happened to be filled.
 */
function GenerationCollage() {
  return (
    <div className="relative">
      <div className="shadow-lifted relative aspect-[4/3] overflow-hidden rounded-2xl">
        <Image
          src={IMAGERY.perfumeBottles.src}
          alt={IMAGERY.perfumeBottles.alt}
          fill
          sizes="(max-width: 1024px) 100vw, 560px"
          className="object-cover"
        />
      </div>

      <div className="ring-background shadow-floating absolute -bottom-8 -end-2 hidden aspect-square w-40 overflow-hidden rounded-2xl ring-8 sm:block lg:w-48">
        <Image
          src={IMAGERY.goldNecklace.src}
          alt={IMAGERY.goldNecklace.alt}
          fill
          sizes="192px"
          className="object-cover"
        />
      </div>

      <div className="border-line bg-card/95 shadow-lifted absolute -bottom-6 start-4 rounded-xl border p-3.5 backdrop-blur-md sm:-bottom-8 sm:start-6">
        <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.16em] uppercase">
          Generated theme
        </p>
        <div className="mt-2.5 flex gap-1.5" aria-hidden="true">
          {[
            "#0B5D4B",
            "#1D2A26",
            "#C8A45D",
            "#FAF6EE",
            "#17211F",
            "#6E7B76",
          ].map((hex) => (
            <span
              key={hex}
              className="ring-line size-6 rounded-lg ring-1"
              style={{ background: hex }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
