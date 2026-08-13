import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { auth, signOut } from "@/lib/auth";

/**
 * The guard, and the shell every signed-in page sits in.
 *
 * The check is here rather than on each page because a layout cannot be skipped: a route
 * added under `(dashboard)/` in six months is protected by existing, not by its author
 * remembering. It is still not the *only* line of defence — the API refuses an unowned
 * store inside the use case (architecture.md §8), so a session alone reaches nothing.
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  // A session with no user on it is not a session anyone can act as. Treated as signed out
  // rather than rendered around a hole.
  if (session === null || user === undefined) {
    redirect("/login");
  }

  // Signed in with Google, but the API never issued a token — so every call from here would
  // fail one at a time. Better to say so once, at the door.
  if (session.error !== undefined) {
    redirect(`/login?error=${encodeURIComponent(session.error)}`);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-border/60 border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 sm:px-8">
          <Link
            href="/dashboard"
            className="font-heading text-lg font-semibold tracking-tight"
          >
            Dukkanify
          </Link>

          <div className="flex items-center gap-3">
            <Avatar>
              {user.image !== null && user.image !== undefined && (
                <AvatarImage
                  src={user.image}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              )}
              <AvatarFallback>{initialOf(user.name)}</AvatarFallback>
            </Avatar>

            <span className="hidden text-sm sm:inline">
              {user.name ?? user.email}
            </span>

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}

/** The avatar's fallback when Google has no photo, or the photo fails to load. */
function initialOf(name: string | null | undefined): string {
  return name?.trim().charAt(0).toUpperCase() ?? "?";
}
