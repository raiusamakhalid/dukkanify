import type { SectionContent, SectionType } from "@dukkanify/contracts";
import {
  Contact,
  Grid2x2,
  LayoutTemplate,
  Package,
  Text,
  type LucideIcon,
} from "lucide-react";

/**
 * What a section is called in the interface, and what it looks like in a list.
 *
 * `Record<SectionType, …>` rather than a lookup with a fallback: the contract's section union
 * is closed, so a new member added there is a compile error here — which is the same
 * guarantee `SectionRenderer` gets from its `switch`, and for the same reason. A section
 * silently rendering as an unlabelled row is the list-shaped version of a blank storefront.
 */
export const SECTION_META: Record<
  SectionType,
  { readonly label: string; readonly icon: LucideIcon }
> = {
  HERO: { label: "Hero", icon: LayoutTemplate },
  CATEGORY_GRID: { label: "Categories", icon: Grid2x2 },
  PRODUCT_GRID: { label: "Products", icon: Package },
  RICH_TEXT: { label: "Text", icon: Text },
  CONTACT: { label: "Contact", icon: Contact },
};

/**
 * The words the section is actually showing, for the rail.
 *
 * A list of "Hero, Products, Text, Text, Contact" is a list of component names; a list of
 * "Discover Your Signature Scent, The Collection, Our Story" is a list of the shop. The type
 * label is kept as the eyebrow beside it, so nothing is lost — and it is the fallback when a
 * heading is empty mid-edit, which is a real state the draft store allows.
 */
export function titleOf(content: SectionContent): string {
  const own = content.type === "HERO" ? content.headline : content.heading;
  const trimmed = own.trim();
  return trimmed === "" ? SECTION_META[content.type].label : trimmed;
}
