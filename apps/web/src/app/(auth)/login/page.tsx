import { MAX_PASSWORD_LENGTH } from "@dukkanify/contracts";
import type { Metadata } from "next";
import Link from "next/link";
import { Mashrabiya } from "@/components/mashrabiya";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithPassword } from "@/features/auth/actions";
import { GoogleSignIn } from "@/features/auth/google-sign-in";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Sign-in, by password or with Google (PDF §4.2).
 *
 * A Server Component: both forms submit to Server Actions, so signing in needs no client
 * JavaScript at all and works before hydration — which matters on the one page a visitor
 * cannot get past if it is broken. It is also why a failure arrives as `?error=` rather than
 * as component state, and why a rejected form comes back empty.
 */

/**
 * Every way this page can be reached after something went wrong, in a sentence a person can
 * act on. Auth.js sends its own codes to `pages.error`; `token-exchange-failed` is ours,
 * set on the session when Google succeeded but the API could not be reached (`lib/auth.ts`).
 *
 * Unknown codes fall back rather than rendering whatever arrived in the query string — an
 * error message is not a place to echo user input.
 */
const FAILURE_MESSAGE: Readonly<Record<string, string>> = {
  /** One sentence for an unknown address, a wrong password, and an account whose password a
      Google sign-in removed. The API refuses to tell them apart and so does this (§8). */
  credentials: "Email or password is incorrect.",
  "session-not-started":
    "Your account was created, but we could not start your session. Sign in to continue.",
  "token-exchange-failed":
    "You signed in with Google, but we could not reach Dukkanify to finish setting up your session. Try again in a moment.",
  OAuthAccountNotLinked:
    "That email is already registered through a different sign-in method.",
  AccessDenied: "Google sign-in was cancelled before it finished.",
  Verification: "That sign-in link has expired. Start again below.",
  Configuration:
    "Sign-in is misconfigured on our side. We have been notified — please try again later.",
};

const FALLBACK_MESSAGE =
  "Something interrupted your sign-in. Please try again.";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // A signed-in visitor never reaches this page: `middleware.ts` sends them to the dashboard
  // before it renders, which is the only place that can answer with a redirect rather than a
  // flushed shell. This page therefore only has to render.
  const { error } = await searchParams;
  const failure =
    error === undefined ? null : (FAILURE_MESSAGE[error] ?? FALLBACK_MESSAGE);

  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div
        className="text-accent pointer-events-none absolute inset-0 -z-10 opacity-20 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)]"
        aria-hidden="true"
      >
        <Mashrabiya patternId="mashrabiya-login" className="h-full w-full" />
      </div>

      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="font-heading text-lg font-semibold tracking-tight"
        >
          Dukkanify
        </Link>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight">
          Sign in to build your shop
        </h1>
        <p className="text-muted-foreground mt-3">
          Your stores are saved to your account, so you can come back and edit
          them.
        </p>

        {failure !== null && (
          <div
            role="alert"
            className="border-destructive/40 bg-destructive/10 text-destructive mt-8 rounded-lg border px-4 py-3 text-sm"
          >
            <p>{failure}</p>
            {/* Standing copy, shown for any refusal and keyed on nothing about the address
                typed: it explains the one case a generic message cannot — an account whose
                password was removed when Google was linked to it (§8) — without confirming
                that any particular email is registered here. */}
            {error === "credentials" && (
              <p className="mt-2 opacity-90">
                If you have ever used “Continue with Google” for this address,
                sign in that way. Linking Google removes any password on the
                account.
              </p>
            )}
          </div>
        )}

        <form action={signInWithPassword} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={MAX_PASSWORD_LENGTH}
              className="h-11"
            />
          </div>

          <Button type="submit" size="lg" className="w-full">
            Sign in
          </Button>
        </form>

        <GoogleSignIn />

        <p className="text-muted-foreground mt-6 text-sm">
          New here?{" "}
          <Link href="/signup" className="text-foreground underline">
            Create an account
          </Link>
          . We use your Google account only to identify you — Dukkanify never
          posts anything on your behalf.
        </p>
      </div>
    </main>
  );
}
