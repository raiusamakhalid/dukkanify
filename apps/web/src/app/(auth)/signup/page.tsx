import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@dukkanify/contracts";
import type { Metadata } from "next";
import Link from "next/link";
import { Mashrabiya } from "@/components/mashrabiya";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpWithPassword } from "@/features/auth/actions";
import { GoogleSignIn } from "@/features/auth/google-sign-in";

export const metadata: Metadata = { title: "Create an account" };

/**
 * Registration, the other half of `/login`.
 *
 * Same shape and the same no-JavaScript property: a Server Action creates the account and
 * signs the new visitor straight in, so nobody lands on a second form after filling the
 * first. A name is asked for because the dashboard greets people and draws an initial from
 * it; asking is cheaper than a `?` avatar.
 */

/**
 * What can come back from the action. `email-taken` is the one message here that admits an
 * address exists — a registration form cannot avoid saying so, and pretending otherwise would
 * need a verification email this application does not send (§14). It deliberately does not say
 * *how* that account signs in.
 */
const FAILURE_MESSAGE: Readonly<Record<string, string>> = {
  "email-taken": "That email is already registered. Sign in instead.",
  "weak-password": `Use at least ${String(MIN_PASSWORD_LENGTH)} characters for your password.`,
  "missing-name": "Tell us what to call you.",
  "invalid-email": "That does not look like an email address.",
  "register-failed":
    "We could not create your account just now. Please try again in a moment.",
};

const FALLBACK_MESSAGE =
  "Something interrupted your sign-up. Please try again.";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const failure =
    error === undefined ? null : (FAILURE_MESSAGE[error] ?? FALLBACK_MESSAGE);

  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div
        className="text-accent pointer-events-none absolute inset-0 -z-10 opacity-20 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)]"
        aria-hidden="true"
      >
        <Mashrabiya patternId="mashrabiya-signup" className="h-full w-full" />
      </div>

      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="font-heading text-lg font-semibold tracking-tight"
        >
          Dukkanify
        </Link>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-muted-foreground mt-3">
          Then describe a shop, and Dukkanify builds it — theme, catalogue and
          pages — saved to this account.
        </p>

        {failure !== null && (
          <p
            role="alert"
            className="border-destructive/40 bg-destructive/10 text-destructive mt-8 rounded-lg border px-4 py-3 text-sm"
          >
            {failure}
          </p>
        )}

        <form action={signUpWithPassword} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              maxLength={80}
              className="h-11"
            />
          </div>

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
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={MAX_PASSWORD_LENGTH}
              aria-describedby="password-rule"
              className="h-11"
            />
            {/* Stated rather than discovered by submitting, because a rejected form comes
                back empty and retyping three fields to learn the rule is a poor trade. */}
            <p id="password-rule" className="text-muted-foreground text-xs">
              At least {MIN_PASSWORD_LENGTH} characters.
            </p>
          </div>

          <Button type="submit" size="lg" className="w-full">
            Create account
          </Button>
        </form>

        <GoogleSignIn />

        <p className="text-muted-foreground mt-6 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline">
            Sign in
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
