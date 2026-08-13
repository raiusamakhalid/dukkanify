import {
  type SpacingScale,
  type StoreDto,
  themeToCssVariables,
} from "@dukkanify/contracts";
import type { CSSProperties } from "react";
import { fontStackFor } from "@/lib/fonts";
import { SectionRenderer } from "./section-renderer";

/**
 * A whole generated shop, rendered from its theme.
 *
 * The same component serves the public storefront and the builder preview — one set of
 * section components, two contexts (architecture.md §5). Nothing below reads a product
 * colour: the theme becomes `--brand-*` custom properties on this wrapper, and every section
 * paints with those, which is why block 14's colour pickers can write straight to the DOM
 * with no re-render and no recompile.
 *
 * The three pages are stacked into one document with anchors rather than served as three
 * routes. A generated `ctaHref` is an in-page anchor (`#products`), the About and Contact
 * pages are one section each, and a shop a customer can read by scrolling beats two extra
 * navigations. The pages remain separate rows in the database either way.
 */

/**
 * The frontend owns what "generous" means; the model only chooses the intent
 * (`SPACING_SCALES` in contracts). One number, read by every section as `--brand-space`.
 */
const SECTION_SPACING: Record<SpacingScale, string> = {
  compact: "2.5rem",
  comfortable: "4rem",
  generous: "5.5rem",
};

export function Storefront({ store }: { store: StoreDto }) {
  const theme = store.theme;

  // `themeToCssVariables` is the shared colour and radius mapping. Fonts are added here
  // rather than there because their values are this app's `next/font` variables, which the
  // contracts package has no way to know.
  const style = {
    ...themeToCssVariables(theme),
    "--brand-font-display": fontStackFor(theme.fonts.display),
    "--brand-font-body": fontStackFor(theme.fonts.body),
    "--brand-space": SECTION_SPACING[theme.spacing],
    background: "var(--brand-bg)",
    color: "var(--brand-fg)",
  } as CSSProperties;

  return (
    <div
      lang={store.locale}
      dir={store.direction.toLowerCase()}
      style={style}
      data-storefront={store.slug}
    >
      <StorefrontHeader store={store} />

      {store.pages.map((page) => (
        <div key={page.id} id={page.slug}>
          {page.sections.map((section) => (
            <SectionRenderer key={section.id} section={section} store={store} />
          ))}
        </div>
      ))}

      <footer
        className="px-6 py-10 text-center text-sm sm:px-10"
        style={{
          borderTop:
            "1px solid color-mix(in srgb, var(--brand-muted) 25%, transparent)",
          color: "var(--brand-muted)",
          fontFamily: "var(--brand-font-body)",
        }}
      >
        © {new Date().getFullYear()} {store.name}
      </footer>
    </div>
  );
}

/** The shop's own navigation — one link per page, in the order the pages were generated. */
function StorefrontHeader({ store }: { store: StoreDto }) {
  return (
    <header
      className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-10"
      style={{
        borderBottom:
          "1px solid color-mix(in srgb, var(--brand-muted) 25%, transparent)",
      }}
    >
      <span
        className="text-lg font-semibold tracking-tight"
        style={{
          fontFamily: "var(--brand-font-display)",
          color: "var(--brand-fg)",
        }}
      >
        {store.name}
      </span>

      <nav
        aria-label={`${store.name} pages`}
        className="flex flex-wrap items-center gap-5 text-sm"
        style={{ fontFamily: "var(--brand-font-body)" }}
      >
        {store.pages.map((page) => (
          <a
            key={page.id}
            href={`#${page.slug}`}
            className="underline-offset-4 hover:underline"
            style={{ color: "var(--brand-muted)" }}
          >
            {page.title}
          </a>
        ))}
      </nav>
    </header>
  );
}
