import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shaped like the form column both auth pages render — a wordmark, a heading, a line of
 * copy, then fields and a button — so the moment before either appears is not a differently
 * proportioned page flashing past. The emerald panel beside it needs no placeholder: it is
 * static, and a skeleton for decoration is a skeleton nobody was waiting on.
 */
export default function AuthLoading() {
  return (
    <main
      className="flex min-h-dvh flex-col justify-center px-6 py-14 sm:px-10 lg:px-14 xl:px-20"
      role="status"
      aria-label="Loading"
    >
      <div className="mx-auto w-full max-w-sm">
        <Skeleton className="h-9 w-36 rounded-xl" />
        <Skeleton className="mt-10 h-10 w-full" />
        <Skeleton className="mt-4 h-5 w-3/4" />

        <div className="mt-8 space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        <Skeleton className="mt-10 h-12 w-full rounded-xl" />
      </div>

      <span className="sr-only">Loading</span>
    </main>
  );
}
