import { StoreDtoSchema } from "@dukkanify/contracts";
import type { Metadata } from "next";
import { BuilderWorkspace } from "@/features/builder/builder-workspace";
import { apiAsUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Builder" };

/**
 * The owner's view of a generated shop.
 *
 * The storefront inside the canvas is the *same* `Storefront` components the public route
 * renders — one set of section components, two contexts (architecture.md §5). The only
 * difference is what surrounds them: here, three panes of chrome; there, nothing at all.
 *
 * This file is a fetch and a hand-off. Everything interactive lives in `BuilderWorkspace`,
 * which is the one client boundary on the route: the store is fetched on the server with the
 * caller's bearer token, and the browser never learns the API's address.
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

  return <BuilderWorkspace store={store} />;
}
