import { AuthResponseSchema, SignInRequestSchema } from "@dukkanify/contracts";
import NextAuth, { type User } from "next-auth";
import { getToken } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { headers } from "next/headers";
import { z } from "zod";
import { ApiError, type ApiRequestOptions, apiRequest } from "./api-client";

/**
 * Google sign-in, exchanged for an application token (architecture.md §8).
 *
 * Auth.js proves *who* the visitor is; it does not decide what they may touch. The Google
 * `id_token` is therefore sent to `POST /auth/google`, which verifies it server-side against
 * the client ID and answers with our own JWT — the only credential the API accepts. The
 * browser never sees the Google token, and no API key of any kind exists in this app.
 *
 * `AUTH_SECRET`, `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are read by Auth.js from the
 * environment by convention, which is why they are absent from this file.
 */

/** Matches the API's 7-day token, so the two expire together rather than the session
    outliving the credential it carries and failing on the next request. */
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * Auth.js reads this from the environment itself; it is named here only because
 * `getAccessToken` has to decrypt the same cookie Auth.js wrote. Validated rather than
 * assumed, so a missing secret is a readable sentence rather than every sign-in silently
 * producing a session with no credential.
 *
 * Read on first use, not on import: `next build` executes this module to collect page data,
 * and a variable that is only needed at runtime should not be able to fail a build.
 */
const AUTH_SECRET_SCHEMA = z
  .string()
  .min(
    32,
    "AUTH_SECRET must be at least 32 characters — generate one with `openssl rand -hex 32`",
  );

let authSecret: string | undefined;

function sessionSecret(): string {
  authSecret ??= AUTH_SECRET_SCHEMA.parse(process.env.AUTH_SECRET);
  return authSecret;
}

/**
 * The password door, as an Auth.js provider rather than a Server Action of its own.
 *
 * One session mechanism is the whole point: whichever way a visitor gets in, the credential
 * ends up on the same encrypted cookie, and `getAccessToken` below stays the only reader.
 * A hand-rolled cookie beside Auth.js would be two sources of truth about who is signed in.
 *
 * `authorize` returns `null` for every failure — wrong password, unknown address, API
 * unreachable. Auth.js turns that into `CredentialsSignin`, and the form maps it to the one
 * sentence the API already chose. Distinguishing them here would leak exactly what the API
 * refuses to (architecture.md §8).
 */
const PasswordCredentials = Credentials({
  credentials: { email: { type: "email" }, password: { type: "password" } },
  authorize: async (credentials): Promise<User | null> => {
    // Whatever arrives at a provider is a form post, which makes it external input.
    const parsed = SignInRequestSchema.safeParse(credentials);
    if (!parsed.success) {
      return null;
    }

    try {
      const { accessToken, user } = await apiRequest("/auth/login", {
        method: "POST",
        body: parsed.data,
        schema: AuthResponseSchema,
      });
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.avatarUrl,
        accessToken,
      };
    } catch (cause) {
      // Logged, because "the API was down" and "the password was wrong" look identical from
      // the browser and only one of them is worth waking someone up for.
      console.error("Password sign-in was refused", cause);
      return null;
    }
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google, PasswordCredentials],
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    /**
     * Runs on sign-in with `account` present, and on every session read without it. The
     * exchange therefore happens exactly once per sign-in; afterwards the token is carried.
     */
    async jwt({ token, account, user }) {
      // The password path exchanged its credential inside `authorize`, so there is nothing to
      // call here — only a token to carry across. It has to come first: a credentials sign-in
      // has an `account` with no `id_token`, which the Google branch below reads as "not a
      // sign-in" and returns untouched, leaving a session that looks valid and has no
      // credential on it. Every API call would then fail one at a time.
      if (account?.provider === "credentials") {
        return { ...token, accessToken: user.accessToken, error: undefined };
      }

      if (account?.id_token === undefined) {
        return token;
      }

      try {
        const { accessToken } = await apiRequest("/auth/google", {
          method: "POST",
          body: { idToken: account.id_token },
          schema: AuthResponseSchema,
        });
        return { ...token, accessToken, error: undefined };
      } catch (cause) {
        // Never fail the sign-in itself here: throwing sends the visitor to a bare Auth.js
        // error page. The session is issued without a credential and marked, so the guard
        // in the dashboard layout can send them back to /login with something to read.
        console.error("Token exchange with the API failed", cause);
        return {
          ...token,
          accessToken: undefined,
          error: "token-exchange-failed",
        };
      }
    },

    /**
     * The access token stays on the JWT and is deliberately *not* copied here: `useSession()`
     * hands the session to client components, and a bearer token is not theirs to hold.
     * Only the failure flag crosses over, because the UI has to be able to explain itself.
     */
    session({ session, token }) {
      session.error = token.error;
      return session;
    },
  },
});

/**
 * The signed-in caller's API credential, or `null` when there is no usable session.
 *
 * Read from the session *cookie* rather than from `auth()`, because the access token is
 * deliberately not on the session object: Auth.js serves the session at
 * `/api/auth/session`, so anything put there is readable by any script on the page. Kept on
 * the encrypted cookie, the API token is server-only — every call that carries it is made
 * from a Server Component or a Server Action, and the browser never holds a bearer token.
 *
 * `getToken` carries a "not recommended" note in v5 aimed at *authenticating* server-side,
 * which `auth()` does above. This is the other job: reading the credential the token holds.
 * Both cookie names are tried so the naming convention stays Auth.js's business rather than
 * something this file has to guess from `NODE_ENV`.
 *
 * Lives here rather than in `api-client.ts` because the dependency runs one way: the token
 * exchange above is itself an API call, so the client cannot know about sessions.
 */
export async function getAccessToken(): Promise<string | null> {
  const request = { headers: await headers() };
  const token =
    (await getToken({
      req: request,
      secret: sessionSecret(),
      secureCookie: true,
    })) ??
    (await getToken({
      req: request,
      secret: sessionSecret(),
      secureCookie: false,
    }));

  return token?.accessToken ?? null;
}

/**
 * An API call made as the signed-in user.
 *
 * Every authenticated read and write in the app goes through this, so "attach the bearer
 * token, and do not cache a response that holds someone's private data" is decided once.
 * Throws `ApiError('unauthorized')` when there is no session, which is the same failure the
 * API would answer with — one branch for the caller instead of two.
 */
export async function apiAsUser<T>(
  path: string,
  options: Omit<ApiRequestOptions<T>, "token">,
): Promise<T> {
  const token = await getAccessToken();
  if (token === null) {
    throw new ApiError(
      "unauthorized",
      401,
      "Your session has expired. Sign in again to continue.",
    );
  }
  // One account's stores must never be served to another from a cache, so a read carries
  // `no-store` unless the caller asked for something else. Tagging is that something else:
  // tags exist to be revalidated after a write, and a response that is never stored has
  // nothing for a tag to point at — forcing `no-store` over them would quietly do nothing.
  const cache =
    options.cache ?? (options.tags === undefined ? "no-store" : undefined);

  return apiRequest(path, {
    ...options,
    token,
    ...(cache === undefined ? {} : { cache }),
  });
}
