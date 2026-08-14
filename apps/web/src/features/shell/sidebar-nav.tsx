"use client";

import { motion, useReducedMotion } from "motion/react";
import { LayoutGrid, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * The workspace's navigation, in the two shapes it needs.
 *
 * A client component for one reason: `usePathname`. Which item is current is the only thing
 * here the server cannot decide, and it is worth the boundary — a rail whose active state is
 * a guess is a rail nobody trusts.
 *
 * The active marker is a shared `layoutId`, so moving between pages slides it rather than
 * cutting. Two rails exist on the page at different breakpoints, so each is given its own
 * marker id: one id across both would make the hidden rail's marker try to animate to the
 * visible one's position.
 */

const ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid, exact: true },
  {
    href: "/dashboard/new",
    label: "Create store",
    icon: Sparkles,
    exact: false,
  },
] as const;

function useActiveHref(): string | undefined {
  const pathname = usePathname();
  // Longest match wins, so `/dashboard/new` does not light up `/dashboard` as well.
  return ITEMS.filter((item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href),
  )
    .map((item) => item.href)
    .sort((a, b) => b.length - a.length)[0];
}

export function SidebarNav() {
  const active = useActiveHref();
  const still = useReducedMotion() ?? false;

  return (
    <nav aria-label="Workspace" className="mt-8">
      <ul className="space-y-1">
        {ITEMS.map((item) => (
          <li key={item.href} className="relative">
            {item.href === active && (
              <motion.span
                layoutId="rail-active"
                className="bg-gold/15 ring-gold/25 absolute inset-0 rounded-xl ring-1"
                transition={
                  still
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 400, damping: 34 }
                }
              />
            )}
            <Link
              href={item.href}
              aria-current={item.href === active ? "page" : undefined}
              className={cn(
                "focus-visible:ring-gold relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                item.href === active
                  ? "text-gold"
                  : "text-ivory/60 hover:text-ivory hover:bg-white/5",
              )}
            >
              <item.icon className="size-4.5 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The same two destinations as a horizontal row of pills, for narrow screens.
 *
 * A drawer was the other option and was rejected: two items do not justify a control that
 * has to be opened before it can be read. This is the whole navigation, visible, one tap
 * from anywhere.
 */
export function MobileNav() {
  const active = useActiveHref();

  return (
    <nav aria-label="Workspace" className="flex gap-2">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.href === active ? "page" : undefined}
          className={cn(
            "focus-visible:ring-gold flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
            item.href === active
              ? "bg-gold/15 text-gold"
              : "text-ivory/60 hover:text-ivory",
          )}
        >
          <item.icon className="size-4" aria-hidden="true" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
