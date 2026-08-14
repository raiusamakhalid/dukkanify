import { cn } from "@/lib/utils";

/**
 * The mark, and the mark with the name beside it.
 *
 * The glyph is the same eight-point khatam star the mashrabiya pattern is built from — one
 * tile of it, pulled out and set in a rounded square. Using the motif at two scales is what
 * makes it an identity rather than a background: the reader meets the star in the logo, then
 * recognises the lattice behind the hero.
 *
 * Drawn in `currentColor` with the star knocked out in the tile's own colour, so a single
 * component sits on ivory in the header and on emerald in the footer with a class, not a
 * variant.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-emerald text-ivory grid size-9 shrink-0 place-items-center rounded-[10px]",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      >
        {/* The turned square and the upright one, crossing rather than nesting. */}
        <path d="M12 2.6 21.4 12 12 21.4 2.6 12Z" />
        <path d="M5.6 5.6h12.8v12.8H5.6Z" />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  tone = "ink",
  markClassName,
}: {
  className?: string;
  /** `ivory` for the dark footer and the dashboard's emerald rail. */
  tone?: "ink" | "ivory";
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark
        className={cn(
          tone === "ivory" && "bg-gold text-emerald-deep",
          markClassName,
        )}
      />
      <span
        className={cn(
          "font-heading text-[1.0625rem] font-semibold tracking-tight",
          tone === "ivory" ? "text-ivory" : "text-foreground",
        )}
      >
        Dukkanify
      </span>
    </span>
  );
}
