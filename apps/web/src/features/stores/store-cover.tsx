import Image from "next/image";
import { imageryFor } from "@/lib/imagery";
import { cn } from "@/lib/utils";

/**
 * The picture on a store card.
 *
 * A generated store has no cover image — nothing produces one, and `StoreSummaryDto` does
 * not even carry the theme, so the card cannot repaint itself in the shop's own colours the
 * way the builder can. Two honest options were left, and this uses both in order.
 *
 * First, match the shop's own words against the small library in `lib/imagery.ts`: a store
 * called "Al Noor Fragrances — aged oud and attar" gets perfume, and one whose words match
 * nothing gets no photograph at all rather than a random one.
 *
 * Second, when nothing matches, draw a tile from the product's palette angled by the slug —
 * deterministic, so the same store is the same tile on every render and every machine. This
 * is the same fallback `ProductImage` uses, for the same reason.
 */
export function StoreCover({
  name,
  tagline,
  slug,
  className,
  sizes,
}: {
  name: string;
  tagline: string | null;
  slug: string;
  className?: string;
  sizes: string;
}) {
  const image = imageryFor(`${name} ${tagline ?? ""}`, slug);

  if (image !== null) {
    return (
      <div className={cn("relative overflow-hidden", className)}>
        <Image
          src={image.src}
          alt=""
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div
          aria-hidden="true"
          className="from-emerald-deep/45 absolute inset-0 bg-gradient-to-t via-transparent to-transparent"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid place-items-center overflow-hidden transition-transform duration-700 group-hover:scale-105",
        className,
      )}
      aria-hidden="true"
      style={{
        background: `linear-gradient(${String(angleFor(slug))}deg, color-mix(in srgb, var(--gold) 38%, var(--ivory)), color-mix(in srgb, var(--emerald) 30%, var(--ivory)))`,
      }}
    >
      <span className="font-heading text-emerald-deep/35 text-4xl font-semibold">
        {initialsOf(name)}
      </span>
    </div>
  );
}

function angleFor(seed: string): number {
  const sum = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0);
  return sum % 180;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}
