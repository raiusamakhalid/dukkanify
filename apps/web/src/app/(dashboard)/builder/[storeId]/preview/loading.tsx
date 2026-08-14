import { Skeleton } from "@/components/ui/skeleton";

export default function OwnerPreviewLoading() {
  return (
    <div role="status" aria-label="Loading preview">
      <div className="border-border/60 border-b px-6 py-3 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="px-6 py-16 sm:px-8">
        <Skeleton className="mx-auto h-10 w-2/3 max-w-xl" />
        <Skeleton className="mx-auto mt-4 h-5 w-1/2 max-w-md" />
        <Skeleton className="mx-auto mt-8 h-11 w-32" />
      </div>
      <span className="sr-only">Loading preview</span>
    </div>
  );
}
