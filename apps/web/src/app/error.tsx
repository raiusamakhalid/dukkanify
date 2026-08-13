"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { isApiError } from "@/lib/api-client";

/**
 * The default route-level error state.
 *
 * Shows the API's own sentence when there is one — those are written for people, in
 * `AllExceptionsFilter` and the use cases behind it — and a plain fallback otherwise. Never
 * the stack, never the status code: a visitor can do nothing with either, and `requestId` is
 * the thing worth quoting to support, which is why it is the one technical detail kept.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message = isApiError(error)
    ? error.message
    : "Something went wrong while loading this page.";
  const reference = isApiError(error) ? error.requestId : error.digest;

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">That did not work</h1>
      <p className="text-muted-foreground mt-3 text-base">{message}</p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to the start
        </Link>
      </div>

      {reference !== undefined && (
        <p className="text-muted-foreground mt-8 text-xs">
          Reference <code className="font-mono">{reference}</code>
        </p>
      )}
    </main>
  );
}
