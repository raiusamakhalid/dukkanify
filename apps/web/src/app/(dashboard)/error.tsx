"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { isApiError } from "@/lib/api-client";

/**
 * The dashboard's error state.
 *
 * It differs from the root boundary in one way that matters: a signed-in page failing with
 * `unauthorized` means the session died mid-visit, and "Try again" would fail again forever.
 * That case gets a route back to sign-in instead of a button that cannot work.
 */
export default function DashboardError({
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
    : "Something went wrong while loading your stores.";
  const reference = isApiError(error) ? error.requestId : error.digest;

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {expired ? "Your session has expired" : "That did not work"}
      </h1>
      <p className="text-muted-foreground mt-3">{message}</p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {expired ? (
          <Link href="/login" className={buttonVariants()}>
            Sign in again
          </Link>
        ) : (
          <>
            <Button onClick={reset}>Try again</Button>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Back to the start
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
