import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shaped like the builder rather than like a page: a bar, a rail, a canvas and a panel. The
 * three panes appear in the positions they will occupy, so the moment the store arrives
 * nothing moves — which is the whole job of a skeleton and the reason a centred spinner
 * would be a worse answer here than anywhere else in the app.
 */
export default function BuilderLoading() {
  return (
    <div
      className="flex h-dvh flex-col overflow-hidden"
      role="status"
      aria-label="Loading the builder"
    >
      <div className="border-line bg-card flex shrink-0 items-center gap-4 border-b px-4 py-2.5">
        <Skeleton className="size-8 rounded-[10px]" />
        <div className="flex-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-1.5 h-3 w-64" />
        </div>
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="border-line bg-card hidden w-64 shrink-0 border-e p-3 lg:block">
          {[0, 1, 2].map((group) => (
            <div key={group} className="mb-5">
              <Skeleton className="mx-2 h-3 w-16" />
              <div className="mt-2.5 space-y-1.5">
                {[0, 1].map((row) => (
                  <Skeleton key={row} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-muted/40 min-w-0 flex-1 p-4 sm:p-6">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>

        <div className="border-line bg-card hidden w-80 shrink-0 border-s p-5 lg:block">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <div className="mt-6 space-y-4">
            {[0, 1, 2].map((field) => (
              <div key={field}>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-1.5 h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-6 h-10 w-full rounded-lg" />
        </div>
      </div>

      <span className="sr-only">Loading the builder</span>
    </div>
  );
}
