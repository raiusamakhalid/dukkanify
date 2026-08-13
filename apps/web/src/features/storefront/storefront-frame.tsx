import {
  type SpacingScale,
  type StoreDto,
  themeToCssVariables,
} from "@dukkanify/contracts";
import type { CSSProperties, ReactNode } from "react";
import { fontStackFor } from "@/lib/fonts";

/**
 * The shell a generated shop is painted into: its theme, its reading direction, its
 * navigation and its footer.
 *
 * Extracted from `Storefront` so the builder can put the *same* frame around the *same*
 * section components while adding selection on top — one set of components, two contexts
 * (architecture.md §5). No `"use client"` here on purpose: it holds no state and no handlers,
 * so it renders on the server for the public storefront and inside a client component in the
 * builder, from one file.
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

/**
 * The theme as CSS custom properties.
 *
 * `themeToCssVariables` is the shared colour and radius mapping. Fonts are added here rather
 * than there because their values are this app's `next/font` variables, which the contracts
 * package has no way to know. Every section paints from these and nothing else, which is why
 * the editor's colour pickers can write one property and repaint the whole shop.
 */
export function storefrontStyle(store: StoreDto): CSSProperties {
  const theme = store.theme;

  return {
    ...themeToCssVariables(theme),
    "--brand-font-display": fontStackFor(theme.fonts.display),
    "--brand-font-body": fontStackFor(theme.fonts.body),
    "--brand-space": SECTION_SPACING[theme.spacing],
    background: "var(--brand-bg)",
    color: "var(--brand-fg)",
  } as CSSProperties;
}

export function StorefrontFrame({
  store,
  children,
  ...rest
}: {
  store: StoreDto;
  children: ReactNode;
} & Omit<React.ComponentProps<"div">, "children" | "style">) {
  return (
    <div
      lang={store.locale}
      dir={store.direction.toLowerCase()}
      style={storefrontStyle(store)}
      data-storefront={store.slug}
      {...rest}
    >
      <StorefrontHeader store={store} />
      {children}
      <StorefrontFooter store={store} />
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

function StorefrontFooter({ store }: { store: StoreDto }) {
  return (
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
  );
}
