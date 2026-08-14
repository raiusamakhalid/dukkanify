import { MAX_PASSWORD_LENGTH } from "@dukkanify/contracts";
import { AlertCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithPassword } from "@/features/auth/actions";
import { AuthLayout } from "@/features/auth/auth-layout";
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
    <AuthLayout
      title="Welcome back"
      lede="Your stores are saved to your account, so you can come back and edit them."
      footer={
        <>
          New here?{" "}
          <Link
            href="/signup"
            className="text-emerald font-medium underline underline-offset-4"
          >
            Create an account
          </Link>
          .
        </>
      }
    >
      {failure !== null && (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/8 text-destructive mt-8 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
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
            className="h-12 rounded-lg"
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
            className="h-12 rounded-lg"
          />
        </div>

        <button
          type="submit"
          className="bg-emerald text-ivory hover:bg-emerald-deep focus-visible:ring-ring shadow-soft w-full rounded-xl px-6 py-3.5 text-base font-medium transition-all duration-300 hover:shadow-lifted focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Sign in
        </button>
      </form>

      <GoogleSignIn />
    </AuthLayout>
  );
}
