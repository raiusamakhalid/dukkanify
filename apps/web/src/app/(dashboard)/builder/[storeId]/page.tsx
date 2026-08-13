import { StoreDtoSchema } from "@dukkanify/contracts";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Storefront } from "@/features/storefront/storefront";
import { apiAsUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Builder" };

/**
 * The owner's view of a generated shop.
 *
 * The storefront inside this frame is the *same* `Storefront` component the public route
 * renders — one set of section components, two contexts (architecture.md §5). The only
 * difference is what surrounds it: here, the chrome an owner needs; there, nothing at all.
 * Block 14 adds the editor panel beside it without touching a section component.
 */
export default async function BuilderPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const store = await apiAsUser(`/store/${storeId}`, {
    schema: StoreDtoSchema,
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            ← Your stores
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {store.name}
            </h1>
            <Badge
              variant={store.status === "PUBLISHED" ? "default" : "secondary"}
            >
              {store.status === "PUBLISHED" ? "Published" : "Draft"}
            </Badge>
          </div>

          <p className="text-muted-foreground mt-2 text-sm">
            Generated from “{store.prompt}”
          </p>
        </div>

        <Link
          href={`/preview/${store.slug}`}
          className={cn(buttonVariants({ variant: "outline" }), "border-input")}
        >
          View live storefront
        </Link>
      </div>

      {/* The preview is framed rather than full-bleed: a shop shown inside the builder should
          read as a thing being worked on, not as the page you are currently on. */}
      <div className="border-border/60 mt-8 overflow-hidden rounded-xl border shadow-sm">
        <Storefront store={store} />
      </div>
    </div>
  );
}
