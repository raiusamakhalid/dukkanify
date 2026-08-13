import type { Metadata } from "next";
import Link from "next/link";
import { Mashrabiya } from "@/components/mashrabiya";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Sign-in, with Google as the only identity provider (PDF §4.2).
 *
 * A Server Component: the button submits a form to a Server Action, so signing in needs no
 * client JavaScript at all and works before hydration — which matters on the one page a
 * visitor cannot get past if it is broken.
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
          <p
            role="alert"
            className="border-destructive/40 bg-destructive/10 text-destructive mt-8 rounded-lg border px-4 py-3 text-sm"
          >
            {failure}
          </p>
        )}

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
          className="mt-8"
        >
          <Button type="submit" size="lg" className="w-full">
            <GoogleMark />
            Continue with Google
          </Button>
        </form>

        <p className="text-muted-foreground mt-6 text-sm">
          We use your Google account only to identify you. Dukkanify never posts
          anything on your behalf.
        </p>
      </div>
    </main>
  );
}

/** Google's mark, drawn rather than fetched: one request fewer, and it cannot 404. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.93l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.64H1.27a12 12 0 0 0 0 10.72l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.27 6.64l4 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
