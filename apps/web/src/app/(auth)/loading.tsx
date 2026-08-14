import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shaped like the card both auth pages render — a wordmark, a heading, a line of copy, then
 * fields and a button — so the moment before either appears is not a differently proportioned
 * page flashing past.
 */
export default function AuthLoading() {
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center px-6 py-16"
      role="status"
      aria-label="Loading"
    >
      <div className="w-full max-w-sm">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-8 h-9 w-full" />
        <Skeleton className="mt-4 h-5 w-3/4" />

        <div className="mt-8 space-y-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>

        <Skeleton className="mt-6 h-11 w-full" />
      </div>

      <span className="sr-only">Loading</span>
    </main>
  );
}
