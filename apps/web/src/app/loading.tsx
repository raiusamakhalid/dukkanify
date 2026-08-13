import { Skeleton } from "@/components/ui/skeleton";

/**
 * The default route-level loading state.
 *
 * Shaped like a page — a title, a line of supporting text, a band of cards — rather than a
 * spinner, so the layout does not jump when the real content arrives. Route groups that
 * look different enough to need their own get one; this is what the rest fall back to.
 */
export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-8"
      role="status"
      aria-label="Loading"
    >
      <Skeleton className="h-9 w-2/3 max-w-sm" />
      <Skeleton className="mt-4 h-5 w-full max-w-md" />

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((card) => (
          <div key={card} className="space-y-4 rounded-lg border p-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>

      <span className="sr-only">Loading</span>
    </div>
  );
}
