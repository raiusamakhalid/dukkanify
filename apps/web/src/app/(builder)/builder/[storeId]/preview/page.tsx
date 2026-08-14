import { StoreDtoSchema } from "@dukkanify/contracts";
import { ArrowLeft, EyeOff } from "lucide-react";
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
 *
 * The bar is deliberately the only thing on the page that is not the shop. Anything more
 * would be the builder, and the point of this route is to see the storefront with none of
 * the builder's chrome over it.
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
      <div className="bg-emerald-deep sticky top-0 z-50 px-5 py-2.5 sm:px-8">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3">
          <p className="text-ivory/70 flex items-center gap-2 text-xs sm:text-sm">
            <EyeOff className="size-3.5 shrink-0" aria-hidden="true" />
            Private preview — only you can see this
            {store.status === "PUBLISHED" ? "." : " until you publish."}
          </p>

          <Link
            href={`/builder/${storeId}`}
            className="text-ivory hover:text-gold focus-visible:ring-gold group inline-flex items-center gap-1.5 rounded-md text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none sm:text-sm"
          >
            <ArrowLeft
              className="size-3.5 transition-transform duration-300 group-hover:-translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:translate-x-0.5"
              aria-hidden="true"
            />
            Back to the editor
          </Link>
        </div>
      </div>

      <Storefront store={store} />
    </div>
  );
}
