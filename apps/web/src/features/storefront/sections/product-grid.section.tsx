import type {
  ProductDto,
  ProductGridContent,
  StoreDto,
} from "@dukkanify/contracts";
import Image from "next/image";
import { imageryFor } from "@/lib/imagery";
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
      className="px-5 @2xl:px-10"
      style={{ paddingBlock: "var(--brand-space)" }}
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          heading={content.heading}
          subheading={content.subheading}
        />

        <ul className="mt-12 grid gap-5 @lg:grid-cols-2 @4xl:grid-cols-4 @4xl:gap-6">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} store={store} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ProductCard({
  product,
  store,
}: {
  product: ProductDto;
  store: StoreDto;
}) {
  return (
    <article
      className="group/product flex h-full flex-col overflow-hidden transition-transform duration-500 hover:-translate-y-1"
      style={{
        border:
          "1px solid color-mix(in srgb, var(--brand-muted) 25%, transparent)",
        borderRadius: "var(--brand-radius)",
      }}
    >
      <ProductImage product={product} store={store} />

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
          className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed"
          style={{
            fontFamily: "var(--brand-font-body)",
            color: "var(--brand-muted)",
          }}
        >
          {product.description}
        </p>

        <p
          className="mt-4 text-sm font-semibold"
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
 * The tile above a product.
 *
 * Three cases, in order of how true they are. A product that carries its own `imageUrl` is
 * rendered with it. Otherwise the product's own words — its name, its description and the
 * sentence the shop was generated from — are matched against the verified library in
 * `lib/imagery.ts`, so an oud gets oud and a bracelet gets a bracelet; the SKU decides which
 * of that subject's photographs, so a grid of eight is not eight copies of one bottle.
 *
 * And when the words match nothing, the original fallback still stands: a tile drawn from
 * the store's own palette, angled by the SKU. Nothing generates product photography
 * (architecture.md §14), and a shop selling something this library has never heard of is
 * better served by an honest gradient than by a stock photograph of a different trade.
 */
function ProductImage({
  product,
  store,
}: {
  product: ProductDto;
  store: StoreDto;
}) {
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

  const image = imageryFor(
    `${product.name} ${product.description} ${store.prompt}`,
    product.sku,
  );

  if (image !== null) {
    return (
      <div className="relative aspect-square w-full overflow-hidden">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 45vw, 280px"
          className="object-cover transition-transform duration-700 group-hover/product:scale-105"
        />
      </div>
    );
  }

  return (
    <div
      className="flex aspect-square w-full items-center justify-center"
      aria-hidden="true"
      style={{
        background: `linear-gradient(${String(angleFor(product.sku))}deg, color-mix(in srgb, var(--brand-accent) 35%, var(--brand-bg)), color-mix(in srgb, var(--brand-primary) 20%, var(--brand-bg)))`,
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
