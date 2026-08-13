/**
 * What this application adds to an Auth.js session and token.
 *
 * The augmentation targets `@auth/core/*` rather than `next-auth`, because `next-auth` only
 * re-exports these types — augmenting a re-export declares a second, unrelated interface and
 * the additions never appear where they are read.
 *
 * Module augmentation rather than casts at the call site: `token.accessToken` is either a
 * typed part of the token everywhere or an `as` in every file that touches it, and
 * CLAUDE.md rules out the second.
 */

declare module "@auth/core/types" {
  interface Session {
    /** Set when the Google token could not be exchanged for an application token, so the
        session exists but carries no credential. The dashboard guard reads it. */
    error?: string | undefined;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    /** The API's own JWT. Stays on the encrypted token and is never put on the session,
        because `useSession()` hands the session to client components. */
    accessToken?: string | undefined;
    error?: string | undefined;
  }
}

export {};
