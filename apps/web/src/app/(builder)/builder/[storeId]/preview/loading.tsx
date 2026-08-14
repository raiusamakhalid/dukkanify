import { Skeleton } from "@/components/ui/skeleton";

/** Shaped like a storefront: a bar, a hero, then a row of product tiles. */
export default function OwnerPreviewLoading() {
  return (
    <div role="status" aria-label="Loading preview">
      <div className="bg-emerald-deep px-5 py-3 sm:px-8">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3">
          <Skeleton className="h-4 w-56 bg-white/10" />
          <Skeleton className="h-4 w-32 bg-white/10" />
        </div>
      </div>

      <div className="px-6 py-16 sm:px-10 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Skeleton className="mx-auto h-12 w-4/5" />
          <Skeleton className="mx-auto mt-5 h-5 w-3/5" />
          <Skeleton className="mx-auto mt-9 h-12 w-40 rounded-lg" />
        </div>

        <div className="mx-auto mt-20 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <div key={tile}>
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="mt-3 h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Loading preview</span>
    </div>
  );
}
