import type { HeroContent, StoreDto } from "@dukkanify/contracts";
import Image from "next/image";
import { primaryImageryFor } from "@/lib/imagery";

/**
 * The first screen of a generated shop.
 *
 * Every colour, radius and typeface here is a `--brand-*` custom property set by
 * `StorefrontFrame` from the theme the model produced (architecture.md §11). Nothing
 * references the product's own palette, which is what lets the same component render a sand
 * perfume house and a charcoal bukhoor shop without a branch — and what makes the editor's
 * colour pickers work with no re-render.
 *
 * The photograph is chosen from the shop's *own words* — its name, its tagline and the
 * sentence it was generated from — against the small verified library in `lib/imagery.ts`.
 * A shop whose words match nothing gets the centred, image-free hero instead of an
 * illustration that has nothing to do with it. Nothing generates a hero image, and inventing
 * one that contradicts the shop would be worse than not having one.
 */
export function HeroSection({
  content,
  store,
}: {
  content: HeroContent;
  store: StoreDto;
}) {
  const image = primaryImageryFor(
    `${store.name} ${store.tagline ?? ""} ${store.prompt}`,
  );

  if (image === null) {
    return (
      <Shell>
        <div className="mx-auto max-w-3xl text-center">
          <Copy content={content} align="center" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Copy content={content} align="start" />

        <div className="relative order-first aspect-[4/3] overflow-hidden lg:order-none lg:aspect-[4/5]">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 560px"
            priority
            className="object-cover"
            style={{ borderRadius: "var(--brand-radius)" }}
          />
          {/* Ties the photograph to the palette, so a theme change reaches the picture too
              instead of leaving one fixed rectangle in the middle of a repainted page. */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              borderRadius: "var(--brand-radius)",
              background:
                "linear-gradient(160deg, color-mix(in srgb, var(--brand-bg) 30%, transparent), transparent 55%)",
            }}
          />
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="px-6 sm:px-10"
      style={{
        paddingBlock: "calc(var(--brand-space) * 1.4)",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--brand-accent) 12%, transparent), transparent)",
      }}
    >
      {children}
    </section>
  );
}

function Copy({
  content,
  align,
}: {
  content: HeroContent;
  align: "start" | "center";
}) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <h1
        // Capped at 5xl rather than 6xl: this component renders at full width on the public
        // route *and* inside the builder's canvas, which is roughly half a laptop. A size
        // that reads as a hero on the first is a size that fills the second.
        className="text-4xl leading-[1.08] font-semibold text-balance sm:text-5xl"
        style={{
          fontFamily: "var(--brand-font-display)",
          color: "var(--brand-fg)",
        }}
      >
        {content.headline}
      </h1>

      <p
        className={`mt-6 max-w-2xl text-lg leading-relaxed ${align === "center" ? "mx-auto" : ""}`}
        style={{
          fontFamily: "var(--brand-font-body)",
          color: "var(--brand-muted)",
        }}
      >
        {content.subheadline}
      </p>

      <a
        href={content.ctaHref}
        className="mt-9 inline-flex items-center px-7 py-3.5 text-base font-medium transition-opacity hover:opacity-90"
        style={{
          background: "var(--brand-primary)",
          color: "var(--brand-bg)",
          borderRadius: "var(--brand-radius)",
          fontFamily: "var(--brand-font-body)",
        }}
      >
        {content.ctaLabel}
      </a>
    </div>
  );
}
