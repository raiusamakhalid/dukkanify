import { Skeleton } from "@/components/ui/skeleton";

/**
 * The dashboard's own loading state, shaped like the dashboard rather than like a page in
 * general: a greeting, the action beside it, and a grid of store cards. The root
 * `loading.tsx` would show three feature-sized boxes here, which is a different page
 * appearing for a moment.
 */
export default function DashboardLoading() {
  return (
    <div
      className="mx-auto max-w-6xl px-6 py-12 sm:px-8 sm:py-16"
      role="status"
      aria-label="Loading your stores"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-4 h-5 w-40" />
        </div>
        <Skeleton className="h-11 w-36" />
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((card) => (
          <div key={card} className="border-border/60 rounded-xl border p-6">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-6 h-3 w-40" />
          </div>
        ))}
      </div>

      <span className="sr-only">Loading your stores</span>
    </div>
  );
}
