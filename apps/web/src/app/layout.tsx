import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Dukkanify — describe your shop, get a storefront",
    template: "%s · Dukkanify",
  },
  description:
    "Describe the shop you want in a sentence and Dukkanify builds the storefront: theme, hero, categories, products and pages, ready to edit.",
};

/** The sand ground, so the browser chrome and any overscroll match the page rather than
    flashing white before the stylesheet lands. */
export const viewport: Viewport = {
  themeColor: "#fbf7f0",
};

/**
 * The application shell.
 *
 * `dir` is set here, once, and everything below is laid out with logical properties
 * (`ms-*`, `pe-*`, `start-*`) — so an Arabic storefront is this attribute changing and
 * nothing else (architecture.md §11). A generated store carries its own `lang`/`dir` on its
 * wrapper, because a shop can be Arabic while the dashboard around it is not.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={fontVariables}>
      <body>
        {children}
        {/* `bottom-center` because sonner's corner positions are physical, not logical:
            a corner chosen here would sit on the wrong side of an Arabic page. `dir="auto"`
            still mirrors the toast's own contents. */}
        <Toaster position="bottom-center" dir="auto" closeButton richColors />
      </body>
    </html>
  );
}
