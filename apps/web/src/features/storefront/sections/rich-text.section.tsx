import type { RichTextContent } from "@dukkanify/contracts";
import { SectionHeading } from "./section-heading";

/**
 * The About page's prose.
 *
 * `paragraphs` is an array rather than one blob of text, so spacing is this component's
 * decision and no markdown parser has to run on model output (contracts, `RichTextContent`).
 *
 * Set on a tinted panel rather than on the bare page: a wall of generated prose between two
 * image-heavy sections is where a storefront reads as thin, and giving it a ground of its
 * own makes it look like a chosen page instead of a gap.
 */
export function RichTextSection({ content }: { content: RichTextContent }) {
  return (
    <section
      className="px-6 sm:px-10"
      style={{ paddingBlock: "var(--brand-space)" }}
    >
      <div
        className="mx-auto max-w-3xl px-6 py-10 sm:px-12 sm:py-14"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--brand-accent) 9%, transparent), transparent)",
          borderRadius: "var(--brand-radius)",
          border:
            "1px solid color-mix(in srgb, var(--brand-muted) 18%, transparent)",
        }}
      >
        <SectionHeading heading={content.heading} />

        <div className="mt-8 space-y-5">
          {content.paragraphs.map((paragraph, index) => (
            <p
              // Paragraphs have no ids and can repeat a sentence; position is what identifies
              // one, and the list is never reordered.
              key={index}
              className="text-base leading-relaxed"
              style={{
                fontFamily: "var(--brand-font-body)",
                color: "var(--brand-fg)",
              }}
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
