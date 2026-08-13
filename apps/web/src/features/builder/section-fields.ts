import {
  type SectionContent,
  SectionContentSchema,
} from "@dukkanify/contracts";

/**
 * Which parts of a section a person may edit, and how an edit is applied.
 *
 * The interesting move is in `withField`: instead of hand-writing a typed setter per field
 * per section type — five switches of five branches, all of them a chance to assign the wrong
 * key — an edited copy is handed back to `SectionContentSchema`. The contract is already the
 * authority on what a section may contain, so parsing the result *is* the type guard: it
 * returns a real `SectionContent` with no cast, and it refuses an edit that would empty a
 * required headline or break a link, with the same message the API would send back.
 */

export interface SectionField {
  readonly key: string;
  readonly label: string;
  /** `lines` is an array in the contract, edited as one textarea, one entry per line. */
  readonly kind: "text" | "paragraph" | "lines";
  readonly value: string;
}

/**
 * Every editable field of a section, in the order it should appear.
 *
 * A `switch` over the discriminated union, so a new section type is a compile error here as
 * well as in the renderer (architecture.md §5).
 */
export function fieldsOf(content: SectionContent): readonly SectionField[] {
  switch (content.type) {
    case "HERO":
      return [
        {
          key: "headline",
          label: "Headline",
          kind: "text",
          value: content.headline,
        },
        {
          key: "subheadline",
          label: "Supporting line",
          kind: "paragraph",
          value: content.subheadline,
        },
        {
          key: "ctaLabel",
          label: "Button label",
          kind: "text",
          value: content.ctaLabel,
        },
      ];

    case "CATEGORY_GRID":
      return [
        {
          key: "heading",
          label: "Heading",
          kind: "text",
          value: content.heading,
        },
        {
          key: "subheading",
          label: "Supporting line",
          kind: "paragraph",
          value: content.subheading ?? "",
        },
      ];

    case "PRODUCT_GRID":
      return [
        {
          key: "heading",
          label: "Heading",
          kind: "text",
          value: content.heading,
        },
        {
          key: "subheading",
          label: "Supporting line",
          kind: "paragraph",
          value: content.subheading ?? "",
        },
      ];

    case "RICH_TEXT":
      return [
        {
          key: "heading",
          label: "Heading",
          kind: "text",
          value: content.heading,
        },
        {
          key: "paragraphs",
          label: "Paragraphs (one per line)",
          kind: "lines",
          value: content.paragraphs.join("\n"),
        },
      ];

    case "CONTACT":
      return [
        {
          key: "heading",
          label: "Heading",
          kind: "text",
          value: content.heading,
        },
        { key: "email", label: "Email", kind: "text", value: content.email },
        { key: "phone", label: "Phone", kind: "text", value: content.phone },
        {
          key: "addressLines",
          label: "Address (one per line)",
          kind: "lines",
          value: content.addressLines.join("\n"),
        },
      ];

    default: {
      const unhandled: never = content;
      return unhandled;
    }
  }
}

export type FieldEdit =
  | { readonly ok: true; readonly content: SectionContent }
  | { readonly ok: false; readonly message: string };

export function withField(
  content: SectionContent,
  field: SectionField,
  raw: string,
): FieldEdit {
  const value = field.kind === "lines" ? splitLines(raw) : raw;
  const parsed = SectionContentSchema.safeParse({
    ...content,
    [field.key]: value,
  });

  if (parsed.success) {
    return { ok: true, content: parsed.data };
  }

  const issue = parsed.error.issues.find((candidate) =>
    candidate.path.includes(field.key),
  );
  return {
    ok: false,
    message: `${field.label}: ${issue?.message ?? "that value cannot be used here"}`,
  };
}

/** Blank lines are spacing in a textarea, not empty paragraphs the contract should store. */
function splitLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
