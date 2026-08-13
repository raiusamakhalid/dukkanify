import { handlers } from "@/lib/auth";

/**
 * Auth.js's own endpoints: the sign-in redirect, the Google callback, sign-out, and the
 * session endpoint the browser reads.
 *
 * The whole configuration — the provider, the token exchange with the API, what is allowed
 * on the session — lives in `lib/auth.ts`, so this file has nothing to decide.
 */
export const { GET, POST } = handlers;
