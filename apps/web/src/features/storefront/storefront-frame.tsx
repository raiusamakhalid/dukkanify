import {
  type SpacingScale,
  type StoreDto,
  themeToCssVariables,
} from "@dukkanify/contracts";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
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
  className,
  ...rest
}: {
  store: StoreDto;
  children: ReactNode;
} & Omit<React.ComponentProps<"div">, "children" | "style">) {
  return (
    /*
      `@container` is the load-bearing class on this element.

      Every section below sizes itself with container queries — `@4xl:grid-cols-2` rather
      than `lg:grid-cols-2` — which means the storefront responds to the width of *this*
      element instead of the width of the window. On the public route the two are the same
      thing. Inside the builder they are not: the canvas is roughly half a laptop, and with
      viewport queries a hero laid out for 1440px was being drawn into 700px, wrapping its
      headline onto four lines. It is also what makes the builder's mobile toggle honest —
      narrowing the canvas now produces the real mobile layout rather than a squeezed
      desktop one.
    */
    <div
      lang={store.locale}
      dir={store.direction.toLowerCase()}
      style={storefrontStyle(store)}
      data-storefront={store.slug}
      // Pulled out of `rest` and merged rather than spread over: a caller passing a class
      // must not be able to remove the container that every section below depends on.
      className={cn("@container", className)}
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
      className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 @2xl:px-10 @2xl:py-6"
      style={{
        borderBottom:
          "1px solid color-mix(in srgb, var(--brand-muted) 22%, transparent)",
      }}
    >
      <span
        className="text-xl font-semibold tracking-tight"
        style={{
          fontFamily: "var(--brand-font-display)",
          color: "var(--brand-fg)",
        }}
      >
        {store.name}
      </span>

      <div className="flex flex-wrap items-center gap-5">
        <nav
          aria-label={`${store.name} pages`}
          // Wraps rather than hides on a narrow storefront: the About and Contact pages are
          // only reachable from here and the footer, and a shop with no way to reach its
          // contact page on a phone is a shop nobody can phone.
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
          style={{ fontFamily: "var(--brand-font-body)" }}
        >
          {store.pages.map((page) => (
            <a
              key={page.id}
              href={`#${page.slug}`}
              className="underline-offset-4 transition-opacity hover:underline hover:opacity-80"
              style={{ color: "var(--brand-muted)" }}
            >
              {page.title}
            </a>
          ))}
        </nav>

        <a
          href="#products"
          className="px-4 py-2 text-xs font-medium transition-opacity hover:opacity-90"
          style={{
            background: "var(--brand-primary)",
            color: "var(--brand-bg)",
            borderRadius: "var(--brand-radius)",
            fontFamily: "var(--brand-font-body)",
          }}
        >
          {store.locale === "ar" ? "تسوّق الآن" : "Shop now"}
        </a>
      </div>
    </header>
  );
}

/**
 * The footer, carrying the shop's own line about itself.
 *
 * The tagline is repeated here rather than something being invented for the space: it is the
 * one sentence the generator already wrote about what this shop is, and a footer with a
 * fabricated slogan in it is a footer that contradicts the hero.
 */
function StorefrontFooter({ store }: { store: StoreDto }) {
  return (
    <footer
      className="px-5 py-12 @2xl:px-10"
      style={{
        borderTop:
          "1px solid color-mix(in srgb, var(--brand-muted) 22%, transparent)",
        fontFamily: "var(--brand-font-body)",
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6 @2xl:flex-row @2xl:items-end @2xl:justify-between">
        <div className="max-w-md">
          <p
            className="text-lg font-semibold"
            style={{
              fontFamily: "var(--brand-font-display)",
              color: "var(--brand-fg)",
            }}
          >
            {store.name}
          </p>
          {store.tagline !== null && (
            <p className="mt-2 text-sm" style={{ color: "var(--brand-muted)" }}>
              {store.tagline}
            </p>
          )}
        </div>

        <nav
          aria-label={`${store.name} pages`}
          className="flex flex-wrap gap-5 text-sm"
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
      </div>

      <p
        className="mx-auto mt-8 max-w-6xl text-xs"
        style={{ color: "var(--brand-muted)" }}
      >
        © {new Date().getFullYear()} {store.name}
      </p>
    </footer>
  );
}
