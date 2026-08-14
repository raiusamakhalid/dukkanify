/**
 * The heading block every section but the hero opens with.
 *
 * One component so the four of them cannot drift into four slightly different type scales —
 * which is exactly how a generated page starts looking generated. The accent rule above the
 * heading is the shop's one repeated ornament: short, drawn in `--brand-accent`, and the
 * only thing on the page that says "a designer chose this" without a designer having.
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
      <span
        aria-hidden="true"
        className="block h-px w-10"
        style={{ background: "var(--brand-accent)" }}
      />

      <h2
        className="mt-5 text-2xl leading-tight font-semibold text-balance @xl:text-3xl @4xl:text-4xl"
        style={{
          fontFamily: "var(--brand-font-display)",
          color: "var(--brand-fg)",
        }}
      >
        {heading}
      </h2>

      {subheading !== undefined && (
        <p
          className="mt-4 text-base leading-relaxed"
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
