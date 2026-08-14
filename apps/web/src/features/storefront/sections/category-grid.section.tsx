import type {
  CategoryDto,
  CategoryGridContent,
  StoreDto,
} from "@dukkanify/contracts";
import Image from "next/image";
import { imageryFor } from "@/lib/imagery";
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
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          heading={content.heading}
          subheading={content.subheading}
        />

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((category) => (
            <li key={category.id}>
              <CategoryTile
                category={category}
                store={store}
                href={
                  narrowedGrids.has(category.slug)
                    ? `#products-${category.slug}`
                    : "#products"
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * A department, as a picture with its name over it.
 *
 * The photograph comes from the category's own name against `lib/imagery.ts` — so "Oud &
 * Attar" gets oud — and falls back to a palette tile when nothing matches, which is the same
 * rule the product grid follows. The overlay is mixed from `--brand-fg` rather than being a
 * fixed black, so the name stays readable on a shop whose background is nearly white and on
 * one whose background is nearly black.
 */
function CategoryTile({
  category,
  store,
  href,
}: {
  category: CategoryDto;
  store: StoreDto;
  href: string;
}) {
  const image = imageryFor(`${category.name} ${store.prompt}`, category.slug);

  return (
    <a
      href={href}
      className="group/category relative block aspect-[4/3] overflow-hidden transition-transform duration-500 hover:-translate-y-1"
      style={{
        borderRadius: "var(--brand-radius)",
        border:
          "1px solid color-mix(in srgb, var(--brand-accent) 45%, transparent)",
      }}
    >
      {image === null ? (
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--brand-accent) 30%, var(--brand-bg)), color-mix(in srgb, var(--brand-primary) 18%, var(--brand-bg)))",
          }}
        />
      ) : (
        <Image
          src={image.src}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 45vw, 380px"
          className="object-cover transition-transform duration-700 group-hover/category:scale-105"
        />
      )}

      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--brand-fg) 70%, transparent), transparent 65%)",
        }}
      />

      <span
        className="absolute inset-x-5 bottom-4 text-lg font-semibold"
        style={{
          fontFamily: "var(--brand-font-display)",
          color: "var(--brand-bg)",
        }}
      >
        {category.name}
      </span>
    </a>
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
