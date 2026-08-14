import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { DEMO_STORES, type DemoStore } from "./demo-stores";
import { Section, SectionHeader } from "./section";

/**
 * Four shops the generator has produced, with the sentences that produced them.
 *
 * The card links to sign-in and says so — "Start from this brief" — rather than "View
 * store". There is no hosted demo behind these; a link promising one and delivering a login
 * form is the small lie that makes a person distrust the rest of the page. What is on offer
 * is the *brief*, which is real: type that sentence and this is roughly what comes back.
 *
 * On a phone the grid becomes a snap-scrolling row. That is not a shrunken desktop layout —
 * four full-width cards stacked is a very long column, and a rail is how a person actually
 * browses a set of looks on a small screen.
 */
export function Templates() {
  return (
    <Section id="templates" labelledBy="templates-title">
      <SectionHeader
        id="templates-title"
        eyebrow="Made by Dukkanify"
        title="Shops it has already built."
        lede="Each of these came from the sentence printed on it. The palette, the categories and the copy are the generator’s, not a designer’s."
      />

      <RevealGroup
        as="ul"
        stagger={0.09}
        className="scrollbar-none -mx-6 mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-4 sm:-mx-8 sm:px-8 lg:mx-0 lg:mt-16 lg:grid lg:grid-cols-2 lg:gap-7 lg:overflow-visible lg:px-0 xl:grid-cols-4"
      >
        {DEMO_STORES.map((store) => (
          <RevealItem
            as="li"
            key={store.id}
            className="w-[78vw] shrink-0 snap-start sm:w-[62vw] lg:w-auto"
          >
            <TemplateCard store={store} />
          </RevealItem>
        ))}
      </RevealGroup>
    </Section>
  );
}

function TemplateCard({ store }: { store: DemoStore }) {
  return (
    <Link
      href="/signup"
      className="border-line bg-card shadow-soft hover:shadow-lifted focus-visible:ring-ring group flex h-full flex-col overflow-hidden rounded-2xl border transition-all duration-500 hover:-translate-y-1.5 focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={store.heroImage.src}
          alt={store.heroImage.alt}
          fill
          sizes="(max-width: 1024px) 78vw, (max-width: 1280px) 45vw, 300px"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Deepens on hover so the label below it stays legible over any photograph. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-100"
        />

        <span
          className="absolute top-3 start-3 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide backdrop-blur-md"
          style={{
            background: "color-mix(in srgb, #FFFFFF 82%, transparent)",
            color: store.theme.colors.primary,
          }}
        >
          {store.category}
        </span>

        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
          <span
            className="font-heading text-lg font-semibold text-white"
            lang={store.locale}
          >
            {store.name}
          </span>

          {/* The palette, on the photograph — a swatch row is the fastest way to say "this
              is a whole generated theme, not a stock image". */}
          <span className="flex gap-1" aria-hidden="true">
            {[
              store.theme.colors.primary,
              store.theme.colors.accent,
              store.theme.colors.background,
            ].map((hex) => (
              <span
                key={hex}
                className="size-3.5 rounded-full ring-1 ring-white/50"
                style={{ background: hex }}
              />
            ))}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p
          className="text-muted-foreground flex-1 text-sm leading-relaxed"
          lang={store.locale}
          dir={store.locale === "ar" ? "rtl" : "ltr"}
        >
          <span className="sr-only">Generated from the prompt: </span>“
          {store.prompt}”
        </p>

        <span className="text-emerald mt-5 inline-flex items-center gap-1.5 text-sm font-medium">
          Start from this brief
          <ArrowRight
            className="size-4 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}
