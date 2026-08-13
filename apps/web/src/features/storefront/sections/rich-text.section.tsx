import type { RichTextContent } from "@dukkanify/contracts";
import { SectionHeading } from "./section-heading";

/**
 * The About page's prose.
 *
 * `paragraphs` is an array rather than one blob of text, so spacing is this component's
 * decision and no markdown parser has to run on model output (contracts, `RichTextContent`).
 */
export function RichTextSection({ content }: { content: RichTextContent }) {
  return (
    <section
      className="px-6 sm:px-10"
      style={{ paddingBlock: "var(--brand-space)" }}
    >
      <div className="mx-auto max-w-2xl">
        <SectionHeading heading={content.heading} />

        <div className="mt-6 space-y-4">
          {content.paragraphs.map((paragraph, index) => (
            <p
              // Paragraphs have no ids and can repeat a sentence; position is what identifies
              // one, and the list is never reordered.
              key={index}
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
