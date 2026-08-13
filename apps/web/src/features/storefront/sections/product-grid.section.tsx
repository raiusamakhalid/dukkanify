import type {
  ProductDto,
  ProductGridContent,
  StoreDto,
} from "@dukkanify/contracts";
import { SectionHeading } from "./section-heading";

/**
 * The catalogue, or one department of it.
 *
 * `categorySlug` narrows the grid; omitted, it shows the whole shop up to `limit`. The
 * anchor id matches what `CategoryGridSection` links to, so a generated "shop the collection"
 * button actually lands somewhere.
 */
export function ProductGridSection({
  content,
  store,
}: {
  content: ProductGridContent;
  store: StoreDto;
}) {
  const category =
    content.categorySlug === undefined
      ? undefined
      : store.categories.find(
          (candidate) => candidate.slug === content.categorySlug,
        );

  const products = store.products
    .filter(
      (product) => category === undefined || product.categoryId === category.id,
    )
    .slice(0, content.limit);

  if (products.length === 0) {
    return null;
  }

  return (
    <section
      id={category === undefined ? "products" : `products-${category.slug}`}
      className="px-6 sm:px-10"
      style={{ paddingBlock: "var(--brand-space)" }}
    >
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          heading={content.heading}
          subheading={content.subheading}
        />

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: ProductDto }) {
  return (
    <article
      className="flex h-full flex-col overflow-hidden"
      style={{
        border:
          "1px solid color-mix(in srgb, var(--brand-muted) 30%, transparent)",
        borderRadius: "var(--brand-radius)",
      }}
    >
      <ProductImage product={product} />

      <div className="flex flex-1 flex-col p-4">
        <h3
          className="text-base font-medium"
          style={{
            fontFamily: "var(--brand-font-display)",
            color: "var(--brand-fg)",
          }}
        >
          {product.name}
        </h3>

        <p
          className="mt-2 line-clamp-3 flex-1 text-sm"
          style={{
            fontFamily: "var(--brand-font-body)",
            color: "var(--brand-muted)",
          }}
        >
          {product.description}
        </p>

        <p
          className="mt-4 text-sm font-medium"
          style={{
            fontFamily: "var(--brand-font-body)",
            color: "var(--brand-primary)",
          }}
        >
          {formatPrice(product.price, product.currency)}
        </p>
      </div>
    </article>
  );
}

/**
 * No product photography exists — nothing generates it, and `imageUrl` is null on every
 * product this app has ever saved (architecture.md §14). A broken image or a stock photo of
 * someone else's shop would both be worse than admitting it: this draws a tile from the
 * store's own palette, angled by the SKU so no two products in a row look identical, with
 * the product's initials set in the display face.
 */
function ProductImage({ product }: { product: ProductDto }) {
  if (product.imageUrl !== null) {
    return (
      // A generated store's image could be on any host, and `next/image` would need every
      // one of them declared in `remotePatterns` up front.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={product.imageUrl}
        alt=""
        className="aspect-square w-full object-cover"
      />
    );
  }

  return (
    <div
      className="flex aspect-square w-full items-center justify-center"
      aria-hidden="true"
      style={{
        background: `linear-gradient(${angleFor(product.sku)}deg, color-mix(in srgb, var(--brand-accent) 35%, var(--brand-bg)), color-mix(in srgb, var(--brand-primary) 20%, var(--brand-bg)))`,
      }}
    >
      <span
        className="text-2xl"
        style={{
          fontFamily: "var(--brand-font-display)",
          color: "color-mix(in srgb, var(--brand-fg) 45%, transparent)",
        }}
      >
        {initialsOf(product.name)}
      </span>
    </div>
  );
}

/** Deterministic: the same product is the same tile on every render and every machine. */
function angleFor(sku: string): number {
  const sum = [...sku].reduce((total, char) => total + char.charCodeAt(0), 0);
  return sum % 180;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/**
 * The price arrives as a fixed-point string and stays one everywhere it matters; this is the
 * single place it becomes a number, and only to be formatted. Two decimal places cannot lose
 * anything to binary floating point, and the alternative — hand-rolling currency symbols and
 * separators — gets Arabic numerals and RTL currency placement wrong.
 */
function formatPrice(price: string, currency: string): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency,
  }).format(Number(price));
}
