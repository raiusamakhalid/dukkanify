import type { SectionDto, StoreDto } from "@dukkanify/contracts";
import { CategoryGridSection } from "./sections/category-grid.section";
import { ContactSection } from "./sections/contact.section";
import { HeroSection } from "./sections/hero.section";
import { ProductGridSection } from "./sections/product-grid.section";
import { RichTextSection } from "./sections/rich-text.section";

/**
 * One section, rendered by the component that knows its shape.
 *
 * Adding a section type is three edits: a variant in `SectionContentSchema`, a component
 * file, and one line here. Forgetting the third is a **compile error** — `content` is a
 * discriminated union, so an unhandled member reaches `default` still typed as itself and
 * fails to be assignable to `never`. A blank space on a customer's storefront is not
 * something that should wait for someone to notice it.
 *
 * This is a `switch` rather than the object registry sketched in architecture.md §5, and the
 * reason is type safety rather than taste: an object keyed by section type cannot hand a
 * component its *narrowed* content — `Record<SectionType, ComponentType<Props>>` widens every
 * component to the whole union, and recovering the narrow type at the call site needs a cast,
 * which CLAUDE.md rules out. A switch narrows for free, so `HeroSection` is typed against
 * `HeroContent` and nothing else. §5 has been updated to match.
 */
export function SectionRenderer({
  section,
  store,
}: {
  section: SectionDto;
  store: StoreDto;
}) {
  const { content } = section;

  switch (content.type) {
    case "HERO":
      return <HeroSection content={content} />;
    case "CATEGORY_GRID":
      return <CategoryGridSection content={content} store={store} />;
    case "PRODUCT_GRID":
      return <ProductGridSection content={content} store={store} />;
    case "RICH_TEXT":
      return <RichTextSection content={content} />;
    case "CONTACT":
      return <ContactSection content={content} />;
    default: {
      const unhandled: never = content;
      return unhandled;
    }
  }
}
