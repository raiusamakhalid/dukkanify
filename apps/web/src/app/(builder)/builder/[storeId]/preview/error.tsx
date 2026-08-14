"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { isApiError } from "@/lib/api-client";

/**
 * The preview's own boundary, kept apart from the builder group's for one reason: it can
 * offer a way back to the editor for *this* store, which the group-level boundary cannot —
 * it has no id to route to.
 */
export default function OwnerPreviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;

  useEffect(() => {
    console.error(error);
  }, [error]);

  const expired = isApiError(error) && error.kind === "unauthorized";
  const message = isApiError(error)
    ? error.message
    : "Something went wrong while loading this preview.";
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
            {storeId !== undefined && (
              <Link
                href={`/builder/${storeId}`}
                className="border-input hover:bg-secondary inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition-colors"
              >
                <ArrowLeft
                  className="size-4 rtl:-scale-x-100"
                  aria-hidden="true"
                />
                Back to the editor
              </Link>
            )}
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
