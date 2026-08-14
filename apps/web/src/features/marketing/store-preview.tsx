import { type ThemeTokens, themeToCssVariables } from "@dukkanify/contracts";
import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { fontStackFor } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import type { DemoStore } from "./demo-stores";

/**
 * A generated storefront, drawn at preview scale.
 *
 * This is not the storefront renderer — `features/storefront/` is, and it renders real data
 * from the API. This one draws a *fixed* shop for the marketing page, at a size that fits
 * inside a browser frame, and it earns its place by obeying the same rule the real one does:
 * every colour, radius and typeface comes from `--brand-*` custom properties written by
 * `themeToCssVariables`, and nothing here reaches for the product's own palette.
 *
 * Which is what makes the theme showcase possible. Swap the `theme` prop and the whole
 * preview repaints — header, hero, buttons, product cards — because none of them know what
 * colour they are, exactly as no real section does.
 */
export function StorePreview({
  store,
  theme,
  className,
  /** `compact` drops the product row: for the small previews floating in the hero. */
  density = "full",
}: {
  store: DemoStore;
  /** Overrides the store's own theme. The theme showcase animates this. */
  theme?: ThemeTokens;
  className?: string;
  density?: "full" | "compact";
}) {
  const applied = theme ?? store.theme;
  const rtl = store.locale === "ar";

  const style = {
    ...themeToCssVariables(applied),
    "--brand-font-display": fontStackFor(applied.fonts.display),
    "--brand-font-body": fontStackFor(applied.fonts.body),
    background: "var(--brand-bg)",
    color: "var(--brand-fg)",
    // Every colour in here is a custom property, so one transition declaration on the
    // wrapper is the entire theme-change animation. The children inherit it and nothing
    // has to be told a theme changed.
    transition: "background 600ms ease, color 600ms ease",
  } as CSSProperties;

  return (
    <div
      lang={store.locale}
      dir={rtl ? "rtl" : "ltr"}
      style={style}
      className={cn("overflow-hidden", className)}
    >
      <PreviewHeader store={store} />
      <PreviewHero store={store} />
      {density === "full" && <PreviewProducts store={store} />}
    </div>
  );
}

function PreviewHeader({ store }: { store: DemoStore }) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-7"
      style={{
        borderBottom:
          "1px solid color-mix(in srgb, var(--brand-muted) 22%, transparent)",
      }}
    >
      <span
        className="truncate text-[13px] font-semibold tracking-tight sm:text-sm"
        style={{ fontFamily: "var(--brand-font-display)" }}
      >
        {store.name}
      </span>

      <div
        className="hidden items-center gap-4 text-[11px] sm:flex"
        style={{
          fontFamily: "var(--brand-font-body)",
          color: "var(--brand-muted)",
        }}
      >
        {store.nav.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      {/* A bare "0" in a pill reads as a bug. The bag says what the number counts. */}
      <span
        className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium"
        style={{
          background:
            "color-mix(in srgb, var(--brand-accent) 22%, transparent)",
          color: "var(--brand-fg)",
          borderRadius: "var(--brand-radius)",
        }}
      >
        <ShoppingBag className="size-3" aria-hidden="true" />0
      </span>
    </div>
  );
}

function PreviewHero({ store }: { store: DemoStore }) {
  return (
    <div className="grid gap-0 sm:grid-cols-[1.05fr_1fr]">
      <div className="flex flex-col justify-center px-5 py-7 sm:px-7 sm:py-10">
        <span
          className="text-[10px] tracking-[0.18em] uppercase"
          style={{
            color: "var(--brand-accent)",
            fontFamily: "var(--brand-font-body)",
          }}
        >
          {store.hero.eyebrow}
        </span>

        <h3
          className="mt-3 text-xl leading-[1.15] font-semibold text-balance sm:text-2xl"
          style={{
            fontFamily: "var(--brand-font-display)",
            color: "var(--brand-fg)",
          }}
        >
          {store.hero.headline}
        </h3>

        <p
          className="mt-3 text-xs leading-relaxed sm:text-[13px]"
          style={{
            fontFamily: "var(--brand-font-body)",
            color: "var(--brand-muted)",
          }}
        >
          {store.hero.subheadline}
        </p>

        <span
          className="mt-5 inline-flex w-fit items-center px-4 py-2 text-[11px] font-medium"
          style={{
            background: "var(--brand-primary)",
            color: "var(--brand-bg)",
            borderRadius: "var(--brand-radius)",
            fontFamily: "var(--brand-font-body)",
            transition: "background 600ms ease, color 600ms ease",
          }}
        >
          {store.hero.cta}
        </span>
      </div>

      <div className="relative min-h-40 sm:min-h-56">
        <Image
          src={store.heroImage.src}
          alt={store.heroImage.alt}
          fill
          sizes="(max-width: 640px) 100vw, 320px"
          className="object-cover"
        />
        {/* Ties the photograph to whatever palette is currently applied, so a theme swap
            changes the picture's temperature too rather than leaving one fixed rectangle. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, color-mix(in srgb, var(--brand-bg) 45%, transparent), transparent 45%)",
            transition: "background 600ms ease",
          }}
        />
      </div>
    </div>
  );
}

function PreviewProducts({ store }: { store: DemoStore }) {
  return (
    <div
      className="px-5 pt-6 pb-7 sm:px-7 sm:pb-9"
      style={{
        borderTop:
          "1px solid color-mix(in srgb, var(--brand-muted) 18%, transparent)",
      }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h4
          className="text-sm font-semibold"
          style={{ fontFamily: "var(--brand-font-display)" }}
        >
          {store.locale === "ar" ? "الأكثر مبيعًا" : "Bestsellers"}
        </h4>
        <span
          className="text-[10px]"
          style={{
            color: "var(--brand-muted)",
            fontFamily: "var(--brand-font-body)",
          }}
        >
          {store.locale === "ar" ? "٨ منتجات" : "8 products"}
        </span>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {store.products.map((product) => (
          <li
            key={product.name}
            className="overflow-hidden"
            style={{
              border:
                "1px solid color-mix(in srgb, var(--brand-muted) 22%, transparent)",
              borderRadius: "var(--brand-radius)",
              transition: "border-color 600ms ease",
            }}
          >
            <div className="relative aspect-square">
              <Image
                src={product.image.src}
                alt={product.image.alt}
                fill
                sizes="(max-width: 640px) 45vw, 150px"
                className="object-cover"
              />
            </div>
            <div className="px-2.5 py-2">
              <p
                className="truncate text-[11px] font-medium"
                style={{ fontFamily: "var(--brand-font-display)" }}
              >
                {product.name}
              </p>
              <p
                className="mt-0.5 text-[10px]"
                style={{
                  color: "var(--brand-primary)",
                  fontFamily: "var(--brand-font-body)",
                  transition: "color 600ms ease",
                }}
              >
                {product.price}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
