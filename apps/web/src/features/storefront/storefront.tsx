import type { StoreDto } from "@dukkanify/contracts";
import { SectionRenderer } from "./section-renderer";
import { StorefrontFrame } from "./storefront-frame";

/**
 * A whole generated shop, server-rendered, exactly as a customer sees it.
 *
 * The three pages are stacked into one document with anchors rather than served as three
 * routes. A generated `ctaHref` is an in-page anchor (`#products`), the About and Contact
 * pages are one section each, and a shop a customer can read by scrolling beats two extra
 * navigations. The pages remain separate rows in the database either way.
 *
 * The builder renders the same frame and the same sections with selection layered on top
 * (`features/builder/editable-storefront.tsx`) — this file stays free of any of that, which
 * is what keeps the public storefront free of client JavaScript.
 */
export function Storefront({ store }: { store: StoreDto }) {
  return (
    <StorefrontFrame store={store}>
      {store.pages.map((page) => (
        <div key={page.id} id={page.slug}>
          {page.sections.map((section) => (
            <SectionRenderer key={section.id} section={section} store={store} />
          ))}
        </div>
      ))}
    </StorefrontFrame>
  );
}
