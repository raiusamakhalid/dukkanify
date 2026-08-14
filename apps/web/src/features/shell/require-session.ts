import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * The door every signed-in route stands behind.
 *
 * Extracted from `(dashboard)/layout.tsx` when the builder moved into a route group of its
 * own: two layouts now need the identical three checks, and two copies of a security check
 * is one copy that gets fixed. It is still not the *only* line of defence — `middleware.ts`
 * decides before the first byte, and the API refuses an unowned store inside the use case
 * (architecture.md §8), so a session alone reaches nothing.
 */
export async function requireSession(): Promise<{
  session: Session;
  user: NonNullable<Session["user"]>;
}> {
  const session = await auth();
  const user = session?.user;

  // A session with no user on it is not a session anyone can act as. Treated as signed out
  // rather than rendered around a hole.
  if (session === null || user === undefined) {
    redirect("/login");
  }

  // Signed in, but the API never issued a token — so every call from here would fail one at
  // a time. Better to say so once, at the door.
  if (session.error !== undefined) {
    redirect(`/login?error=${encodeURIComponent(session.error)}`);
  }

  return { session, user };
}

/** The avatar's fallback when there is no photo, or the photo fails to load. */
export function initialOf(name: string | null | undefined): string {
  return name?.trim().charAt(0).toUpperCase() ?? "?";
}

/** "Welcome" alone reads as a finished greeting; "Welcome undefined" reads as a bug. */
export function firstNameOf(name: string | null | undefined): string {
  const first = name?.trim().split(/\s+/)[0];
  return first === undefined || first === "" ? "back" : first;
}
