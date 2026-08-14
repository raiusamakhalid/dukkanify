import {
  BadgeDollarSign,
  Languages,
  MapPin,
  MoveHorizontal,
} from "lucide-react";
import Image from "next/image";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { IMAGERY } from "@/lib/imagery";
import { BilingualPreview } from "./bilingual-preview";
import { Section, SectionHeader } from "./section";

/**
 * The section that says who this is for.
 *
 * The risk with a "built for the Gulf" section is that it becomes a tourism brochure — a
 * skyline, a camel, and no product in sight. The guard here is that every claim is a
 * technical one with a mechanism behind it, and the skyline appears exactly once, cropped
 * tall and set behind a list of those mechanisms rather than as a hero of its own.
 */

const CLAIMS = [
  {
    icon: Languages,
    title: "Arabic that was designed, not translated",
    body: "Both display faces carry Arabic coverage, so an Arabic shop is typeset rather than falling back to whatever the visitor's system has.",
  },
  {
    icon: MoveHorizontal,
    title: "Right-to-left through the whole product",
    body: "Every layout is written in logical properties, so direction is one attribute on the wrapper — not a mirrored stylesheet that drifts.",
  },
  {
    icon: BadgeDollarSign,
    title: "Priced in dirhams by default",
    body: "Money is fixed-point everywhere it matters and formatted for the en-AE locale, so nothing rounds on its way to a price tag.",
  },
  {
    icon: MapPin,
    title: "Dates and hours on Gulf time",
    body: "Timestamps render in Asia/Dubai on every deployment, so a shop updated this morning says so in Sharjah as well as in the data centre.",
  },
] as const;

export function GulfSection() {
  return (
    <Section
      labelledBy="gulf-title"
      className="bg-card/40 border-line/70 border-y"
    >
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <Reveal direction="start" className="relative">
          <div className="shadow-lifted relative aspect-[4/5] overflow-hidden rounded-3xl">
            <Image
              src={IMAGERY.dubaiSkylineNight.src}
              alt={IMAGERY.dubaiSkylineNight.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 520px"
              className="object-cover"
            />
            <div
              aria-hidden="true"
              className="from-emerald-deep/70 absolute inset-0 bg-gradient-to-t via-transparent to-transparent"
            />
            <p className="text-ivory font-heading absolute inset-x-6 bottom-6 text-2xl leading-snug font-semibold">
              Built for the way the Gulf shops.
            </p>
          </div>

          <div className="ring-background shadow-floating absolute -top-6 -end-4 hidden aspect-square w-32 overflow-hidden rounded-2xl ring-8 sm:block lg:w-36">
            <Image
              src={IMAGERY.attarVials.src}
              alt={IMAGERY.attarVials.alt}
              fill
              sizes="144px"
              className="object-cover"
            />
          </div>
        </Reveal>

        <div>
          <SectionHeader
            id="gulf-title"
            eyebrow="Made for the region"
            title="A shop in Sharjah is not a shop in San Francisco."
            lede="Arabic, right-to-left, dirhams and Gulf time are not a localisation pass bolted on at the end — they are how the product is built."
          />

          <RevealGroup as="ul" className="mt-10 space-y-7" stagger={0.09}>
            {CLAIMS.map((claim) => (
              <RevealItem as="li" key={claim.title} className="flex gap-4">
                <span className="bg-emerald/8 text-emerald mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl">
                  <claim.icon className="size-4.5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold">{claim.title}</h3>
                  <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                    {claim.body}
                  </p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>

      <Reveal className="mt-20 sm:mt-28">
        <h3 className="text-center text-2xl font-semibold sm:text-3xl">
          One product, two languages, no switch to flip.
        </h3>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-center">
          Write the brief in Arabic and the shop comes back in Arabic —
          mirrored, retypeset and rewritten, not translated afterwards.
        </p>

        <div className="mt-10">
          <BilingualPreview />
        </div>
      </Reveal>
    </Section>
  );
}
