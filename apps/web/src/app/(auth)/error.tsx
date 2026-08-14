"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { isApiError } from "@/lib/api-client";

/**
 * The boundary for both doors.
 *
 * A sign-in page failing is the one failure with no way around it, so this offers a route
 * rather than a `reset()`: the Server Actions here end in a redirect, and re-rendering the
 * same page is not what a visitor whose form just crashed needs. It also says nothing about
 * credentials — whatever threw, the message is about this page, not about an account.
 */
export default function AuthError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const reference = isApiError(error) ? error.requestId : error.digest;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        We could not show that page
      </h1>
      <p className="text-muted-foreground mt-3">
        Something went wrong before you could sign in. Nothing was changed on
        your account.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/login" className={buttonVariants()}>
          Back to sign in
        </Link>
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
