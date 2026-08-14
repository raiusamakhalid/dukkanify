"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { isApiError } from "@/lib/api-client";

/**
 * The builder's error state.
 *
 * It differs from the root boundary in one way that matters: a signed-in page failing with
 * `unauthorized` means the session died mid-visit, and "Try again" would fail again forever.
 * That case gets a route back to sign-in instead of a button that cannot work.
 */
export default function BuilderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const expired = isApiError(error) && error.kind === "unauthorized";
  const message = isApiError(error)
    ? error.message
    : "Something went wrong while loading this store.";
  const reference = isApiError(error) ? error.requestId : error.digest;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">
        {expired ? "Your session has expired" : "That did not work"}
      </h1>
      <p className="text-muted-foreground mt-3">{message}</p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {expired ? (
          <Link
            href="/login"
            className="bg-emerald text-ivory hover:bg-emerald-deep rounded-xl px-5 py-3 text-sm font-medium transition-colors"
          >
            Sign in again
          </Link>
        ) : (
          <>
            <button
              type="button"
              onClick={reset}
              className="bg-emerald text-ivory hover:bg-emerald-deep inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-colors"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Try again
            </button>
            <Link
              href="/dashboard"
              className="border-input hover:bg-secondary inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition-colors"
            >
              <ArrowLeft
                className="size-4 rtl:-scale-x-100"
                aria-hidden="true"
              />
              Your stores
            </Link>
          </>
        )}
      </div>

      {reference !== undefined && (
        <p className="text-muted-foreground mt-8 text-xs">
          Reference <code className="font-mono">{reference}</code>
        </p>
      )}
    </div>
  );
}
