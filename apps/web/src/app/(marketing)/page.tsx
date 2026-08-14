import { type ThemeTokens, themeToCssVariables } from "@dukkanify/contracts";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Mashrabiya } from "@/components/mashrabiya";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The landing page (PDF §4.1), as a Server Component with no client JavaScript in the tree.
 *
 * Everything here is either a link or a stretch of text, and none of it needs a browser to
 * decide anything: the section anchors are anchors, and the sample storefronts are rendered
 * from theme tokens the same way a real one is. Nothing to hydrate is the reason this page
 * is fast, not a claim about it.
 */

const SIGN_IN_HREF = "/login";

/**
 * An outline button whose edge is actually visible.
 *
 * shadcn's outline variant reaches for the soft `--border`, which is a hairline token — on
 * sand it renders at 1.4:1 and the control reads as plain text. `--input` is the token for
 * something a person can act on and meets 3:1 (globals.css explains the split).
 *
 * Composed through `cn` rather than by appending the class: `buttonVariants` is CVA, which
 * concatenates without resolving conflicts, so `border-border` and `border-input` would both
 * survive and CSS source order — not intent — would decide. `cn` runs tailwind-merge, which
 * keeps the last one.
 */
function outlineLink(size: "sm" | "lg"): string {
  return cn(buttonVariants({ variant: "outline", size }), "border-input");
}

/**
 * Three storefronts the generator actually produces, with the palettes it actually picks —
 * lifted from `MockGenerator`'s profiles rather than invented for the page. A landing page
 * showing output the product cannot produce is the oldest lie in software.
 *
 * They are styled through `themeToCssVariables`, the same function the storefront renderer
 * uses (architecture.md §11), so these cards are a small demonstration of the mechanism
 * rather than a picture of one.
 */
const SAMPLE_STORES: readonly {
  prompt: string;
  name: string;
  tagline: string;
  categories: readonly string[];
  theme: ThemeTokens;
}[] = [
  {
    prompt: "Create a luxury perfume store for UAE customers",
    name: "Dar Al Oud",
    tagline: "Aged oud and hand-blended attar from Sharjah",
    categories: ["Oud & Attar", "Eau de Parfum", "Layering Oils"],
    theme: {
      colors: {
        primary: "#6B4A2B",
        secondary: "#2E2116",
        accent: "#C8A24A",
        background: "#F6EFE2",
        foreground: "#1B120B",
        muted: "#8C7A62",
      },
      fonts: { display: "ibm-plex-sans-arabic", body: "source-serif-4" },
      radius: "0.5rem",
      spacing: "generous",
    },
  },
  {
    prompt: "متجر بخور فاخر لعملاء الإمارات",
    name: "Bayt Al Bukhoor",
    tagline: "Hand-pressed bukhoor and the burners to carry it",
    categories: ["Bukhoor Blends", "Oud Chips", "Burners"],
    theme: {
      colors: {
        primary: "#4A3520",
        secondary: "#1E1710",
        accent: "#B8873B",
        background: "#F2E8D8",
        foreground: "#17110A",
        muted: "#7E6B54",
      },
      fonts: { display: "noto-kufi-arabic", body: "ibm-plex-sans-arabic" },
      radius: "0.25rem",
      spacing: "comfortable",
    },
  },
  {
    prompt: "A gift shop for Ramadan hampers and corporate gifting",
    name: "Hadiya",
    tagline: "Gift boxes assembled in Dubai, wrapped the same day",
    categories: ["Ramadan & Eid", "Corporate Gifting", "Weddings"],
    theme: {
      colors: {
        primary: "#8A5A3B",
        secondary: "#33241A",
        accent: "#D4AF5F",
        background: "#FAF3E7",
        foreground: "#211610",
        muted: "#9A846B",
      },
      fonts: { display: "ibm-plex-sans-arabic", body: "source-serif-4" },
      radius: "1rem",
      spacing: "generous",
    },
  },
];

const STEPS: readonly { title: string; body: string }[] = [
  {
    title: "Say what you sell",
    body: "One sentence is enough, in English or Arabic. “A perfume house in Sharjah selling aged oud” is a brief.",
  },
  {
    title: "Watch the shop appear",
    body: "A palette and type scale, a hero, curated categories, eight products with prices, and the About and Contact pages every shop needs.",
  },
  {
    title: "Make it yours",
    body: "Edit any headline, colour or description in place. Nothing is a template you have to undo.",
  },
];

export default function LandingPage() {
  return (
    <>
      <a
        href="#main"
        className="bg-primary text-primary-foreground focus:ring-ring sr-only rounded-md px-4 py-2 focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:ring-2"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main id="main">
        <Hero />
        <HowItWorks />
        <Examples />
      </main>

      <SiteFooter />
    </>
  );
}

function SiteHeader() {
  return (
    <header className="border-border/60 border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 sm:px-8">
        <span className="font-heading text-lg font-semibold tracking-tight">
          Dukkanify
        </span>

        <nav aria-label="Main" className="flex items-center gap-6">
          <Link
            href="#how-it-works"
            className="text-muted-foreground hover:text-foreground hidden text-sm transition-colors sm:inline"
          >
            How it works
          </Link>
          <Link
            href="#examples"
            className="text-muted-foreground hover:text-foreground hidden text-sm transition-colors sm:inline"
          >
            Examples
          </Link>
          <Link href={SIGN_IN_HREF} className={outlineLink("sm")}>
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* The one mashrabiya on the site. Masked to a soft corner so it reads as a carved
          screen catching light rather than as wallpaper. */}
      <div
        className="text-accent pointer-events-none absolute inset-0 -z-10 opacity-25 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]"
        aria-hidden="true"
      >
        <Mashrabiya className="h-full w-full" />
      </div>

      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-28 lg:py-32">
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          AI store builder, built for the Gulf
        </p>

        <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
          {/* Two lines by construction rather than wherever the measure happens to break:
              the sentence has two halves, and a hero that re-breaks at every width reads
              like an accident at one of them. */}
          <span className="block">Describe your shop.</span>
          <span className="block">Get a storefront.</span>
        </h1>

        <p className="text-muted-foreground mt-6 max-w-2xl text-lg sm:text-xl">
          Write one sentence about what you sell. Dukkanify designs the theme,
          writes the copy, fills the catalogue and saves the whole shop, ready
          for you to edit.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={SIGN_IN_HREF}
            className={buttonVariants({ size: "lg", className: "sm:w-auto" })}
          >
            Create your store
          </Link>
          <Link href="#examples" className={outlineLink("lg")}>
            See what it makes
          </Link>
        </div>

        <p className="text-muted-foreground mt-10 text-sm">
          Try it with something like{" "}
          {/* `box-decoration-clone` so the highlight keeps its padding and corners on both
              lines when it wraps on a narrow screen, instead of shearing off mid-phrase. */}
          <span className="text-foreground bg-secondary box-decoration-clone rounded-md px-2 py-1">
            “Create a luxury perfume store for UAE customers”
          </span>
        </p>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      title="Three steps, about a minute"
      lede="No theme to pick, no blocks to drag, no placeholder text to delete afterwards."
    >
      <ol className="mt-16 grid list-none gap-10 p-0 sm:grid-cols-3 sm:gap-8">
        {STEPS.map((step, index) => (
          <li key={step.title} className="list-none">
            <span
              className="border-accent/50 text-accent-foreground bg-accent/20 font-heading flex size-10 shrink-0 items-center justify-center rounded-full border text-base"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <h3 className="mt-5 text-xl font-semibold tracking-tight">
              {step.title}
            </h3>
            <p className="text-muted-foreground mt-3">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Examples() {
  return (
    <Section
      id="examples"
      title="Shops it has already built"
      lede="Each of these came from the sentence above it. The palette, the categories and the copy are the generator’s, not a designer’s."
    >
      <div className="mt-16 grid gap-8 md:grid-cols-3">
        {SAMPLE_STORES.map((store) => (
          <article
            key={store.name}
            className="overflow-hidden rounded-xl border"
            // The generated theme, applied exactly as a real storefront applies it.
            style={themeToCssVariables(store.theme) as CSSProperties}
          >
            <div
              className="p-6"
              style={{
                background: "var(--brand-bg)",
                color: "var(--brand-fg)",
              }}
            >
              <h3
                className="font-heading text-xl font-semibold"
                style={{ color: "var(--brand-primary)" }}
              >
                {store.name}
              </h3>
              <p className="mt-2 text-sm opacity-80">{store.tagline}</p>

              <ul className="mt-5 flex list-none flex-wrap gap-2 p-0">
                {store.categories.map((category) => (
                  <li
                    key={category}
                    className="border px-2.5 py-1 text-xs"
                    style={{
                      borderColor: "var(--brand-accent)",
                      borderRadius: "var(--brand-radius)",
                    }}
                  >
                    {category}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex gap-1.5" aria-hidden="true">
                {["primary", "secondary", "accent", "muted"].map((token) => (
                  <span
                    key={token}
                    className="size-5 rounded-full"
                    style={{ background: `var(--brand-${token})` }}
                  />
                ))}
              </div>
            </div>

            <p className="text-muted-foreground bg-card border-t px-6 py-4 text-sm">
              <span className="sr-only">Generated from the prompt: </span>“
              {store.prompt}”
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-4 px-6 py-12 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          <span className="font-heading text-foreground font-semibold">
            Dukkanify
          </span>{" "}
          — Al Saqr Business Tower, Sheikh Zayed Road, Dubai
        </p>
        <p>Storefronts generated in English and Arabic.</p>
      </div>
    </footer>
  );
}

/**
 * One section rhythm for the page: same vertical space, same heading scale, same measure.
 * Written once so the page cannot drift into three slightly different sections.
 */
function Section({
  id,
  title,
  lede,
  children,
}: {
  id: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  const headingId = `${id}-title`;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="border-border/60 border-t"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 sm:px-8 sm:py-32">
        <h2
          id={headingId}
          className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
        >
          {title}
        </h2>
        <p className="text-muted-foreground mt-4 max-w-2xl text-lg">{lede}</p>
        {children}
      </div>
    </section>
  );
}
