import type { HeroContent } from "@dukkanify/contracts";

/**
 * The first screen of a generated shop.
 *
 * Every colour, radius and typeface here is a `--brand-*` custom property set by
 * `StorefrontFrame` from the theme the model produced (architecture.md §11). Nothing
 * references the product's own palette, which is what lets the same component render a sand
 * perfume house and a charcoal bukhoor shop without a branch — and what makes the editor's
 * colour pickers work with no re-render in block 14.
 */
export function HeroSection({ content }: { content: HeroContent }) {
  return (
    <section
      className="px-6 sm:px-10"
      style={{
        paddingBlock: "calc(var(--brand-space) * 1.5)",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--brand-accent) 12%, transparent), transparent)",
      }}
    >
      <div className="mx-auto max-w-3xl text-center">
        <h1
          className="text-4xl leading-tight font-semibold text-balance sm:text-5xl"
          style={{
            fontFamily: "var(--brand-font-display)",
            color: "var(--brand-fg)",
          }}
        >
          {content.headline}
        </h1>

        <p
          className="mx-auto mt-6 max-w-2xl text-lg"
          style={{
            fontFamily: "var(--brand-font-body)",
            color: "var(--brand-muted)",
          }}
        >
          {content.subheadline}
        </p>

        <a
          href={content.ctaHref}
          className="mt-10 inline-flex items-center px-6 py-3 text-base font-medium transition-opacity hover:opacity-90"
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
    </section>
  );
}
