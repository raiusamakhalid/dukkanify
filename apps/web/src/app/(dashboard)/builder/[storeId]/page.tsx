import { StoreDtoSchema } from "@dukkanify/contracts";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EditableStorefront } from "@/features/builder/editable-storefront";
import { EditorPanel } from "@/features/builder/editor-panel";
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

      {/* Canvas and editor side by side on a wide screen, stacked on a narrow one — with the
          canvas first either way, because the shop is the thing being worked on and the panel
          is the tool. The preview is framed rather than full-bleed so it reads as a document
          being edited rather than as the page you are currently on. */}
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="group/canvas border-border/60 overflow-hidden rounded-xl border shadow-sm">
          <EditableStorefront store={store} />
        </div>

        <EditorPanel store={store} />
      </div>
    </div>
  );
}
