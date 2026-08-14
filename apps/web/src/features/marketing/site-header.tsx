"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

/**
 * The sticky navigation.
 *
 * It starts transparent, sitting over the hero's own atmosphere, and takes on a blurred
 * ground the moment the page moves — so the hero is uninterrupted at rest and the links stay
 * readable over whatever scrolls beneath them. The scroll listener is passive and does
 * nothing but flip one boolean; the appearance is CSS.
 *
 * The mobile menu is a real dialog in behaviour if not in element: it traps nothing, but it
 * locks the page behind it, closes on Escape, and every link inside closes it on the way out
 * — a menu that stays open over the section it just navigated to is the most common mobile
 * navigation bug there is.
 */

const LINKS = [
  { href: "#showcase", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#templates", label: "Templates" },
] as const;

const SIGN_UP_HREF = "/signup";
const LOG_IN_HREF = "/login";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const still = useReducedMotion() ?? false;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 16);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // The page must not scroll behind an open full-screen menu, and Escape must close it.
  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "border-line/70 bg-background/80 border-b backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-6 px-6 py-4 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="focus-visible:ring-ring rounded-lg focus-visible:ring-2 focus-visible:outline-none"
        >
          <Logo />
          <span className="sr-only">Dukkanify home</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-9 lg:flex">
          {LINKS.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href={LOG_IN_HREF}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Log in
          </Link>
          <StartBuildingButton />
        </div>

        <button
          type="button"
          onClick={() => {
            setOpen((current) => !current);
          }}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="border-line text-foreground focus-visible:ring-ring grid size-10 place-items-center rounded-xl border transition-colors lg:hidden focus-visible:ring-2 focus-visible:outline-none"
        >
          {open ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            initial={still ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="border-line bg-background/97 border-t backdrop-blur-xl lg:hidden"
          >
            <nav
              aria-label="Main"
              className="flex flex-col gap-1 px-6 py-6 sm:px-8"
            >
              {LINKS.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={still ? false : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + index * 0.05, duration: 0.3 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => {
                      setOpen(false);
                    }}
                    className="hover:bg-secondary block rounded-xl px-4 py-3.5 text-lg font-medium transition-colors"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              <div className="border-line mt-4 flex flex-col gap-3 border-t pt-5">
                <Link
                  href={LOG_IN_HREF}
                  onClick={() => {
                    setOpen(false);
                  }}
                  className="border-input hover:bg-secondary rounded-xl border px-4 py-3 text-center text-base font-medium transition-colors"
                >
                  Log in
                </Link>
                <StartBuildingButton
                  className="justify-center py-3.5 text-base"
                  onNavigate={() => {
                    setOpen(false);
                  }}
                />
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/**
 * A link whose underline grows from the leading edge.
 *
 * `origin-` is a logical-ish compromise: the rule is drawn with `start-0 end-0` and scaled
 * on X, so on an Arabic page it grows from the right without a second class.
 */
function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring group relative rounded-md py-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      {children}
      <span
        aria-hidden="true"
        className="bg-emerald absolute -bottom-0.5 start-0 end-0 h-px origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100 rtl:origin-right"
      />
    </Link>
  );
}

/** The one emerald button on the header, with the arrow that moves under the pointer. */
export function StartBuildingButton({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={SIGN_UP_HREF}
      {...(onNavigate === undefined ? {} : { onClick: onNavigate })}
      className={cn(
        "bg-emerald text-ivory hover:bg-emerald-deep focus-visible:ring-ring group inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium shadow-soft transition-all duration-300 hover:shadow-lifted focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        className,
      )}
    >
      Start Building
      <ArrowRight
        className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}
