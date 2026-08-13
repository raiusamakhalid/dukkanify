import { type StoreDto, StoreDtoSchema } from "@dukkanify/contracts";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Storefront } from "@/features/storefront/storefront";
import { apiRequest, isApiError } from "@/lib/api-client";

/**
 * The published storefront, open to anyone with the address.
 *
 * `GET /storefront/:slug` is the one public endpoint (architecture.md §9), so this page
 * carries no token and needs no session — and it is the only page in the app that renders a
 * store nobody signed in for.
 */
export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <Storefront store={await loadStorefront(slug)} />;
}

/**
 * Also where a missing shop becomes a 404.
 *
 * That is not a stylistic choice. A page under a `loading.tsx` boundary streams: the shell
 * is flushed before the component's data arrives, and after that the status line has already
 * been sent — `notFound()` from the component body renders the 404 *page* with a **200**
 * status, which a crawler reads as "this shop exists". Metadata is resolved before the first
 * byte, because the `<head>` depends on it, so a `notFound()` raised here is still able to
 * set the status. `cache` makes both this and the component above share one request.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await loadStorefront(slug);

  return {
    title: store.name,
    // Nothing invented: the tagline is the shop's own line about itself.
    ...(store.tagline === null ? {} : { description: store.tagline }),
  };
}

/**
 * A slug nobody has taken is a 404. Every other failure is left to the error boundary,
 * because "this shop does not exist" and "we could not reach the server" are different
 * things to be told.
 */
const loadStorefront = cache(async (slug: string): Promise<StoreDto> => {
  try {
    return await apiRequest(`/storefront/${encodeURIComponent(slug)}`, {
      schema: StoreDtoSchema,
    });
  } catch (error) {
    if (isApiError(error) && error.kind === "not-found") {
      notFound();
    }
    throw error;
  }
});
