import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Where a request is allowed to go, decided before anything renders.
 *
 * This is middleware rather than a check inside the pages because of how the App Router
 * streams: a layout and its page render **in parallel**, and once the shell has been flushed
 * a `redirect()` can only be delivered as an instruction inside the RSC payload — never as a
 * status code. Both were observed here: `/dashboard` answered 200 with an error boundary
 * while its layout was trying to redirect, having already called the API for nothing. One
 * decision, before the first byte, is the only version of this that is actually true.
 *
 * `(dashboard)/layout.tsx` keeps its own check as well. Two cheap checks are worth one route
 * that someone adds under `(dashboard)/` after changing the matcher below.
 */

const LOGIN = "/login";
const DASHBOARD = "/dashboard";
/** Both doors, so neither shows a form to somebody who is already through it. */
const PUBLIC_AUTH_PATHS: readonly string[] = [LOGIN, "/signup"];

export default auth((request) => {
  const session = request.auth;
  // A session carrying an error has no API credential on it: Google signed the visitor in,
  // the token exchange did not. Every call from the signed-in pages would fail one at a
  // time, so it does not count as being signed in.
  const signedIn = session !== null && session.error === undefined;
  const { pathname, origin } = request.nextUrl;

  if (PUBLIC_AUTH_PATHS.includes(pathname)) {
    // Nothing to sign into: send them where they were going.
    return signedIn
      ? NextResponse.redirect(new URL(DASHBOARD, origin))
      : NextResponse.next();
  }

  if (signedIn) {
    return NextResponse.next();
  }

  const login = new URL(LOGIN, origin);
  if (session?.error !== undefined) {
    login.searchParams.set("error", session.error);
  }
  return NextResponse.redirect(login);
});

export const config = {
  /**
   * Literals, not the constants above: Next reads this export statically at build time and
   * refuses an identifier it cannot evaluate. `:path*` matches zero or more segments, so
   * `/dashboard` itself is covered as well as everything under it.
   */
  matcher: ["/login", "/signup", "/dashboard/:path*", "/builder/:path*"],
};
