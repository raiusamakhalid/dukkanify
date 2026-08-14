import { AiShowcase } from "@/features/marketing/ai-showcase";
import { FinalCta } from "@/features/marketing/cta";
import { Features } from "@/features/marketing/features";
import { GulfSection } from "@/features/marketing/gulf-section";
import { Hero } from "@/features/marketing/hero";
import { HowItWorks } from "@/features/marketing/how-it-works";
import { SiteFooter } from "@/features/marketing/site-footer";
import { SiteHeader } from "@/features/marketing/site-header";
import { SocialProof } from "@/features/marketing/social-proof";
import { Templates } from "@/features/marketing/templates";

/**
 * The landing page (PDF §4.1), assembled from `features/marketing/`.
 *
 * This file is a running order and nothing else — every section owns its own layout, copy
 * and data, so changing what the page says is a change to one file rather than a scroll
 * through a thousand-line component. The order is the argument the page makes: the promise,
 * what it produces, how it works, the proof, what you get, who it is for, and the ask.
 *
 * It is still a Server Component. The interactive parts — the sticky header, the typing
 * prompt, the theme switcher, the language toggle — are client leaves imported into it, so
 * the storefront previews, the photography and every word of copy are server-rendered and
 * only the behaviour ships as JavaScript.
 */
export default function LandingPage() {
  return (
    <>
      <a
        href="#main"
        className="bg-emerald text-ivory focus:ring-ring sr-only rounded-md px-4 py-2 focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[60] focus:ring-2"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main id="main">
        <Hero />
        <SocialProof />
        <AiShowcase />
        <HowItWorks />
        <Features />
        <Templates />
        <GulfSection />
        <FinalCta />
      </main>

      <SiteFooter />
    </>
  );
}
