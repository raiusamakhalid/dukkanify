import { StoreDtoSchema } from "@dukkanify/contracts";
import type { Metadata } from "next";
import Link from "next/link";
import { Storefront } from "@/features/storefront/storefront";
import { apiAsUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Preview" };

/**
 * The owner's private storefront preview — drafts included.
 *
 * `/preview/:slug` is public and published-only. This route is the logged-in equivalent:
 * it loads the store the same way the builder does (`GET /store/:id`), so a draft is
 * visible here and a 404 on the public URL does not leak that the shop exists.
 */
export default async function OwnerPreviewPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const store = await apiAsUser(`/store/${storeId}`, {
    schema: StoreDtoSchema,
  });

  return (
    <div>
      <div className="border-border/60 bg-background border-b px-6 py-3 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            Private preview — only you can see this
            {store.status === "PUBLISHED" ? "." : " until you publish."}
          </p>
          <Link
            href={`/builder/${storeId}`}
            className="text-foreground hover:text-foreground/80 text-sm transition-colors"
          >
            ← Back to editor
          </Link>
        </div>
      </div>

      <Storefront store={store} />
    </div>
  );
}
