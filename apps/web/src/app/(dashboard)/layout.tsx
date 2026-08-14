import { ArrowRight, LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo, LogoMark } from "@/components/logo";
import { Mashrabiya } from "@/components/mashrabiya";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MobileNav, SidebarNav } from "@/features/shell/sidebar-nav";
import { initialOf, requireSession } from "@/features/shell/require-session";
import { signOut } from "@/lib/auth";

/**
 * The workspace shell: a deep emerald rail, and the ivory page beside it.
 *
 * The rail is the product's own colour, held at full strength in one place — which is what
 * lets every page inside it stay quiet. It is fixed rather than sticky so a long list of
 * stores scrolls under an anchored identity, and the content column is inset by exactly the
 * rail's width rather than laid out in a flex row: a `position: fixed` rail takes no space,
 * and padding is the honest way to give it some.
 *
 * The builder is deliberately *not* in here. It moved to its own route group when it grew a
 * three-pane layout of its own — a canvas inside a sidebar inside a sidebar is a canvas
 * nobody can work in. Both groups call `requireSession`, so the guard did not fork.
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requireSession();

  return (
    <div className="min-h-dvh">
      <aside className="bg-emerald-deep bg-aurora-dark fixed inset-y-0 start-0 z-40 hidden w-[17rem] flex-col overflow-hidden border-e border-white/10 px-5 py-6 lg:flex">
        <div
          className="text-gold pointer-events-none absolute inset-0 opacity-[0.06] [mask-image:radial-gradient(70%_40%_at_50%_100%,black,transparent)]"
          aria-hidden="true"
        >
          <Mashrabiya patternId="mashrabiya-rail" className="h-full w-full" />
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <Link
            href="/dashboard"
            className="focus-visible:ring-gold rounded-lg focus-visible:ring-2 focus-visible:outline-none"
          >
            <Logo tone="ivory" />
            <span className="sr-only">Dukkanify dashboard</span>
          </Link>

          <SidebarNav />

          <NewStoreCard />

          <div className="mt-auto pt-6">
            <div className="border-t border-white/10 pt-5">
              <div className="flex items-center gap-3">
                <Avatar className="size-9">
                  {user.image !== null && user.image !== undefined && (
                    <AvatarImage
                      src={user.image}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <AvatarFallback className="bg-gold/20 text-gold text-xs">
                    {initialOf(user.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="text-ivory truncate text-sm font-medium">
                    {user.name ?? user.email}
                  </p>
                  {user.name !== null &&
                    user.name !== undefined &&
                    user.email !== null &&
                    user.email !== undefined && (
                      <p className="text-ivory/40 truncate text-xs">
                        {user.email}
                      </p>
                    )}
                </div>

                <SignOutButton />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* The narrow-screen equivalent: the same identity and the same two destinations,
          stuck to the top so navigation never scrolls away. */}
      <header className="bg-emerald-deep sticky top-0 z-40 border-b border-white/10 lg:hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-3.5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <LogoMark className="bg-gold text-emerald-deep size-8" />
            <span className="font-heading text-ivory text-base font-semibold">
              Dukkanify
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              {user.image !== null && user.image !== undefined && (
                <AvatarImage
                  src={user.image}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              )}
              <AvatarFallback className="bg-gold/20 text-gold text-xs">
                {initialOf(user.name)}
              </AvatarFallback>
            </Avatar>
            <SignOutButton />
          </div>
        </div>

        <div className="scrollbar-none overflow-x-auto px-3 pb-3">
          <MobileNav />
        </div>
      </header>

      <main className="lg:ps-[17rem]">{children}</main>
    </div>
  );
}

/**
 * The one gilded object in the rail.
 *
 * `ring-gilded` is used here and on the dashboard's own primary action and nowhere else —
 * gold marks the thing to do next, and a rail where three items glow marks nothing.
 */
function NewStoreCard() {
  return (
    <Link
      href="/dashboard/new"
      className="ring-gilded focus-visible:ring-gold group mt-8 block rounded-2xl bg-white/[0.04] p-4 transition-all duration-300 hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:outline-none"
    >
      <p className="text-gold text-sm font-semibold">Create Store with AI</p>
      <p className="text-ivory/50 mt-1.5 text-xs leading-relaxed">
        One sentence about what you sell is the whole brief.
      </p>
      <span className="text-gold mt-3 inline-flex items-center gap-1.5 text-xs font-medium">
        Start building
        <ArrowRight
          className="size-3.5 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

/** A form, not a button with a handler: signing out works before hydration. */
function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="text-ivory/50 hover:text-ivory focus-visible:ring-gold grid size-9 place-items-center rounded-lg transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:outline-none"
      >
        <LogOut className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        <span className="sr-only">Sign out</span>
      </button>
    </form>
  );
}
