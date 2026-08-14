import { ArrowLeft, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Mashrabiya } from "@/components/mashrabiya";
import { PromptComposer } from "@/features/generation/prompt-composer";

export const metadata: Metadata = { title: "Create a store" };

/** What one sentence turns into. Listed so the wait has a shape before it starts. */
const OUTPUT = [
  "A palette, a type scale and a corner radius",
  "A hero with a headline and a call to action",
  "Categories drawn from what you sell",
  "Eight products, described and priced in AED",
  "About and Contact pages, written",
] as const;

/**
 * Where "Create Store" leads: a page whose only job is one sentence from the shop owner.
 *
 * A Server Component holding a single client leaf — the composer — which is the whole
 * arrangement architecture.md §5 asks for. The column beside it is deliberately static: it
 * is a contract about what is coming back, and it is the reason the page can be quiet while
 * the model works.
 */
export default function NewStorePage() {
  return (
    <div className="relative isolate overflow-hidden">
      <div
        className="text-emerald pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [mask-image:radial-gradient(60%_45%_at_80%_0%,black,transparent)]"
        aria-hidden="true"
      >
        <Mashrabiya patternId="mashrabiya-new" className="h-full w-full" />
      </div>

      <div className="mx-auto w-full max-w-[1280px] px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring group inline-flex items-center gap-2 rounded-md text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <ArrowLeft
            className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:translate-x-0.5"
            aria-hidden="true"
          />
          Your stores
        </Link>

        <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <h1 className="text-4xl font-semibold sm:text-5xl">
              Describe your shop.
            </h1>
            <p className="text-muted-foreground mt-5 max-w-xl text-lg leading-relaxed">
              Dukkanify designs the theme, writes the hero, groups the catalogue
              into categories and prices eight products — then saves the whole
              shop to your account.
            </p>

            <PromptComposer />
          </div>

          <aside className="lg:pt-4">
            <div className="border-line bg-card shadow-soft rounded-2xl border p-6 lg:sticky lg:top-8">
              <h2 className="text-base font-semibold">What you get back</h2>
              <p className="text-muted-foreground mt-1.5 text-sm">
                Every one of these is generated, and every one is editable
                afterwards.
              </p>

              <ul className="mt-6 space-y-3.5">
                {OUTPUT.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="bg-emerald/10 text-emerald mt-0.5 grid size-5 shrink-0 place-items-center rounded-full">
                      <Check className="size-3" aria-hidden="true" />
                    </span>
                    <span className="text-foreground/85 text-sm leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="border-line text-muted-foreground mt-6 border-t pt-5 text-xs leading-relaxed">
                Your store is saved as a draft. Nothing is public until you
                publish it.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
