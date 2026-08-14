import Link from "next/link";
import { Logo } from "@/components/logo";
import { Container } from "./section";

/**
 * The footer.
 *
 * The columns list what exists. There is no blog, no changelog and no careers page, and
 * printing four of each to fill the grid would be four dead links — so the columns are short
 * and the ones that point somewhere point at real anchors and real routes. Everything under
 * "Legal" is the honest state of a one-day build, said in a sentence rather than linked to a
 * page that was never written.
 */

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "AI generation", href: "#showcase" },
      { label: "Features", href: "#features" },
      { label: "Templates", href: "#templates" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Create a store", href: "/signup" },
      { label: "Your dashboard", href: "/dashboard" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="bg-emerald-deep border-t border-white/10">
      <Container>
        <div className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-10">
          <div className="max-w-sm">
            <Logo tone="ivory" />
            <p className="text-ivory/55 mt-5 leading-relaxed">
              AI-powered commerce for the next generation of Gulf shopkeepers.
            </p>
            <p className="text-ivory/35 mt-6 text-sm">
              Al Saqr Business Tower, Sheikh Zayed Road, Dubai
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-ivory font-sans text-xs font-semibold tracking-[0.18em] uppercase">
                {column.title}
              </h2>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-ivory/60 hover:text-ivory focus-visible:ring-gold rounded text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h2 className="text-ivory font-sans text-xs font-semibold tracking-[0.18em] uppercase">
              Languages
            </h2>
            <p className="text-ivory/60 mt-5 text-sm leading-relaxed">
              Storefronts are generated in{" "}
              <span className="text-ivory">English</span> and{" "}
              <span className="text-ivory" lang="ar">
                العربية
              </span>
              , right-to-left included. The language of your prompt is the
              language of your shop.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 py-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-ivory/40 text-xs">
            © {new Date().getFullYear()} Dukkanify. Built in the UAE.
          </p>
          <p className="text-ivory/40 text-xs">
            Email or Google sign-in. We never post on your behalf.
          </p>
        </div>
      </Container>
    </footer>
  );
}
