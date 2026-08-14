import { Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { BrowserFrame } from "@/components/browser-frame";
import { Logo } from "@/components/logo";
import { Mashrabiya } from "@/components/mashrabiya";
import { AL_NOOR } from "@/features/marketing/demo-stores";
import { StorePreview } from "@/features/marketing/store-preview";

/**
 * The shell both doors stand in.
 *
 * Sign-in and sign-up were two centred cards on an empty page, which is the correct amount
 * of design for a form and the wrong amount for the first screen of a product. The panel
 * beside the form is doing one job: showing what is on the other side of it. It is the same
 * `StorePreview` the landing page uses, from the same fixed record, so nothing here can
 * promise a shop the generator does not make.
 *
 * Below `lg` the panel is gone entirely rather than stacked. On a phone the form is the
 * whole reason for the visit, and a screenful of decoration above it is a scroll between a
 * person and the thing they came to do.
 */

const PROMISES = [
  "A complete storefront from one sentence",
  "Theme, copy, categories and eight products",
  "English or Arabic, right-to-left included",
] as const;

export function AuthLayout({
  title,
  lede,
  children,
  footer,
}: {
  title: string;
  lede: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <main className="relative isolate flex flex-col justify-center overflow-hidden px-6 py-14 sm:px-10 lg:px-14 xl:px-20">
        <div
          className="text-emerald pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [mask-image:radial-gradient(60%_45%_at_50%_0%,black,transparent)] lg:hidden"
          aria-hidden="true"
        >
          <Mashrabiya patternId="mashrabiya-auth" className="h-full w-full" />
        </div>

        <div className="mx-auto w-full max-w-sm">
          <Link
            href="/"
            className="focus-visible:ring-ring inline-block rounded-lg focus-visible:ring-2 focus-visible:outline-none"
          >
            <Logo />
            <span className="sr-only">Dukkanify home</span>
          </Link>

          <h1 className="mt-10 text-3xl font-semibold sm:text-4xl">{title}</h1>
          <p className="text-muted-foreground mt-3 leading-relaxed">{lede}</p>

          {children}

          <div className="text-muted-foreground mt-8 text-sm">{footer}</div>
        </div>
      </main>

      <aside className="bg-emerald-deep bg-aurora-dark relative isolate hidden items-center overflow-hidden lg:flex">
        <div
          className="text-gold pointer-events-none absolute inset-0 opacity-[0.07] [mask-image:radial-gradient(70%_60%_at_30%_0%,black,transparent)]"
          aria-hidden="true"
        >
          <Mashrabiya
            patternId="mashrabiya-auth-panel"
            className="h-full w-full"
          />
        </div>

        <div className="relative w-full px-12 py-16 xl:px-16">
          <h2 className="text-ivory max-w-md text-3xl leading-tight font-semibold xl:text-4xl">
            One sentence in. A whole storefront out.
          </h2>

          <ul className="mt-8 space-y-3">
            {PROMISES.map((promise) => (
              <li key={promise} className="flex items-start gap-3">
                <span className="bg-gold/15 text-gold mt-0.5 grid size-5 shrink-0 place-items-center rounded-full">
                  <Check className="size-3" aria-hidden="true" />
                </span>
                <span className="text-ivory/70 text-sm">{promise}</span>
              </li>
            ))}
          </ul>

          {/* Pushed off the trailing edge so it reads as a window onto something larger
              rather than a screenshot centred in a box. */}
          <div className="mt-12 -me-16 xl:-me-24">
            <BrowserFrame url="alnoor.dukkanify.store" tone="dark">
              <StorePreview store={AL_NOOR} />
            </BrowserFrame>
          </div>
        </div>
      </aside>
    </div>
  );
}
