/**
 * A mashrabiya screen, as one tiling SVG pattern.
 *
 * The motif is the eight-point khatam star that carved wooden screens across the Gulf are
 * built from: a square and the same square turned forty-five degrees, laid over each other.
 * The rotated square's corners sit exactly on the midpoints of the tile edges, so the
 * lattice joins up across tiles instead of showing seams.
 *
 * Used **once**, on the landing hero. A geometric pattern behind every section is a theme,
 * not an identity — and the restraint is the point. It is decorative, so it is hidden from
 * assistive technology, and it draws in `currentColor` so the caller decides its weight
 * with a text colour and an opacity rather than a prop.
 */
export function Mashrabiya({
  className,
  /** Only needed if a second instance ever appears on one page: SVG ids are global. */
  patternId = "mashrabiya",
}: {
  className?: string;
  patternId?: string;
}) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      focusable="false"
      width="100%"
      height="100%"
    >
      <defs>
        <pattern
          id={patternId}
          patternUnits="userSpaceOnUse"
          width="80"
          height="80"
        >
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            {/* The turned square — its corners meet the neighbouring tiles' corners. */}
            <path d="M40 0 L80 40 L40 80 L0 40 Z" />
            {/* The upright square, inset so the two cross rather than nest. */}
            <path d="M12 12 H68 V68 H12 Z" />
            {/* The small centre the eight points open onto. */}
            <path d="M40 26 L54 40 L40 54 L26 40 Z" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
