import { Skeleton } from "@/components/ui/skeleton";

/**
 * The dashboard's own loading state, shaped like the dashboard rather than like a page in
 * general: the greeting panel, three figures, then a grid of store cards with their covers.
 * A generic three-box skeleton here would be a different page appearing for a moment, which
 * is worse than a slower one appearing correctly.
 */
export default function DashboardLoading() {
  return (
    <div
      className="mx-auto w-full max-w-[1280px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12"
      role="status"
      aria-label="Loading your stores"
    >
      <Skeleton className="h-56 w-full rounded-3xl sm:h-64" />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((card) => (
          <div key={card} className="border-line rounded-2xl border p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-xl" />
              <Skeleton className="h-8 w-10" />
            </div>
            <Skeleton className="mt-4 h-4 w-20" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
        ))}
      </div>

      <Skeleton className="mt-12 h-9 w-44" />

      <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((card) => (
          <div
            key={card}
            className="border-line overflow-hidden rounded-2xl border"
          >
            <Skeleton className="aspect-[16/10] w-full rounded-none" />
            <div className="p-5">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="mt-2.5 h-4 w-full" />
              <Skeleton className="mt-5 h-3 w-44" />
              <div className="border-line mt-5 flex gap-2 border-t pt-4">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Loading your stores</span>
    </div>
  );
}
