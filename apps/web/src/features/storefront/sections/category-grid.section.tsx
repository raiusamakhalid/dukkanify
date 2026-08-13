import type { CategoryGridContent, StoreDto } from "@dukkanify/contracts";
import { SectionHeading } from "./section-heading";

/**
 * The shop's departments.
 *
 * `categorySlugs` is a list of references, not of names: the model chooses which categories
 * to feature and in what order, and the names come from the store's own catalogue. A slug
 * with nothing behind it is dropped rather than rendered as an empty tile — the contract
 * already refuses a blueprint whose sections point at categories that were never generated,
 * so this only ever fires if a category is deleted later.
 */
export function CategoryGridSection({
  content,
  store,
}: {
  content: CategoryGridContent;
  store: StoreDto;
}) {
  const featured = content.categorySlugs
    .map((slug) => store.categories.find((category) => category.slug === slug))
    .filter((category) => category !== undefined);

  if (featured.length === 0) {
    return null;
  }

  const narrowedGrids = categoriesWithTheirOwnGrid(store);

  return (
    <section
      className="px-6 sm:px-10"
      style={{ paddingBlock: "var(--brand-space)" }}
    >
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          heading={content.heading}
          subheading={content.subheading}
        />

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((category) => (
            <li key={category.id}>
              <a
                href={
                  narrowedGrids.has(category.slug)
                    ? `#products-${category.slug}`
                    : "#products"
                }
                className="block h-full px-6 py-8 text-center transition-opacity hover:opacity-80"
                style={{
                  border: "1px solid var(--brand-accent)",
                  borderRadius: "var(--brand-radius)",
                  color: "var(--brand-fg)",
                  fontFamily: "var(--brand-font-display)",
                }}
              >
                {category.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Which categories have a product grid of their own.
 *
 * A category tile links to the grid that shows that category — but the model is free to emit
 * one catalogue-wide `PRODUCT_GRID` instead of one per category, and usually does. Without
 * this check every tile would point at an anchor no section renders, which is a link that
 * silently does nothing: the worst kind, because it looks like it worked.
 */
function categoriesWithTheirOwnGrid(store: StoreDto): ReadonlySet<string> {
  const slugs = new Set<string>();

  for (const page of store.pages) {
    for (const section of page.sections) {
      if (
        section.content.type === "PRODUCT_GRID" &&
        section.content.categorySlug !== undefined
      ) {
        slugs.add(section.content.categorySlug);
      }
    }
  }

  return slugs;
}
