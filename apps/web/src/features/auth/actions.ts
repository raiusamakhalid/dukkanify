"use server";

import {
  AuthResponseSchema,
  MIN_PASSWORD_LENGTH,
  SignInRequestSchema,
  SignUpRequestSchema,
} from "@dukkanify/contracts";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { apiRequest, isApiError } from "@/lib/api-client";
import { signIn } from "@/lib/auth";

/**
 * The two password forms, as Server Actions.
 *
 * Failures come back as a code in the query string rather than as component state, which
 * keeps both pages Server Components with no client JavaScript — the property the Google
 * button already had, on the one page a visitor cannot get past if it breaks. The cost is
 * that a rejected form arrives empty: the address has to be typed again. That is the trade
 * made deliberately, and it is why the password rules are stated on the page rather than
 * discovered by submitting.
 *
 * Every path ends in a redirect. `signIn` signals success by throwing one, so the `AuthError`
 * check has to be narrow: catching everything here would swallow the navigation.
 */

const DASHBOARD = "/dashboard";
const LOGIN = "/login";
const SIGNUP = "/signup";

export async function signInWithPassword(formData: FormData): Promise<void> {
  const parsed = SignInRequestSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    redirect(`${LOGIN}?error=credentials`);
  }

  await startSession(parsed.data, `${LOGIN}?error=credentials`);
}

export async function signUpWithPassword(formData: FormData): Promise<void> {
  const parsed = SignUpRequestSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    redirect(`${SIGNUP}?error=${invalidFieldCode(formData)}`);
  }

  try {
    await apiRequest("/auth/register", {
      method: "POST",
      body: parsed.data,
      schema: AuthResponseSchema,
    });
  } catch (cause) {
    // The token this returned is deliberately dropped: the session is established by signing
    // in below, so there is one code path that puts a credential on the cookie instead of two.
    redirect(`${SIGNUP}?error=${registrationCode(cause)}`);
  }

  // The account exists now. If this second step fails they are registered and signed out,
  // which is recoverable — and it is the only thing the sign-in page can honestly say.
  await startSession(
    { email: parsed.data.email, password: parsed.data.password },
    `${LOGIN}?error=session-not-started`,
  );
}

/** Hands the credential to Auth.js, which exchanges it for the API token in `authorize`. */
async function startSession(
  credentials: { email: string; password: string },
  onFailure: string,
): Promise<never> {
  try {
    await signIn("credentials", { ...credentials, redirectTo: DASHBOARD });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(onFailure);
    }
    throw error;
  }
  // `signIn` redirects on success, so this is unreachable — and saying so is better than a
  // return type that pretends the function can fall through.
  throw new Error("Sign-in returned without redirecting");
}

/**
 * Which field to complain about, decided from the raw form rather than from Zod's issues.
 *
 * `@dukkanify/contracts` is compiled to CommonJS and resolves zod's `.d.cts` types while this
 * app resolves the ESM ones, so a `ZodError` from a contracts schema is not the `ZodError`
 * this file's types describe — reading `issues` across that seam is exactly the mismatch
 * `api-client.ts` documents. The three checks below are cheap and do not need the seam.
 */
function invalidFieldCode(formData: FormData): string {
  const password = formData.get("password");
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return "weak-password";
  }
  const name = formData.get("name");
  if (typeof name !== "string" || name.trim() === "") {
    return "missing-name";
  }
  return "invalid-email";
}

function registrationCode(cause: unknown): string {
  if (isApiError(cause) && cause.kind === "conflict") {
    return "email-taken";
  }
  return "register-failed";
}
