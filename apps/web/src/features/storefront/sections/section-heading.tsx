/**
 * The heading block every section but the hero opens with.
 *
 * One component so the four of them cannot drift into four slightly different type scales —
 * which is exactly how a generated page starts looking generated.
 */
export function SectionHeading({
  heading,
  subheading,
}: {
  heading: string;
  subheading?: string | undefined;
}) {
  return (
    <div className="max-w-2xl">
      <h2
        className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
        style={{
          fontFamily: "var(--brand-font-display)",
          color: "var(--brand-fg)",
        }}
      >
        {heading}
      </h2>

      {subheading !== undefined && (
        <p
          className="mt-3"
          style={{
            fontFamily: "var(--brand-font-body)",
            color: "var(--brand-muted)",
          }}
        >
          {subheading}
        </p>
      )}
    </div>
  );
}
