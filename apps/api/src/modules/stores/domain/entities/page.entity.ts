import { type PageType, PageTypeSchema, text } from '@dukkanify/contracts';
import { ensure, parseOrThrow } from '../invariants';
import type { Slug } from '../value-objects/slug.vo';
import type { Section } from './section.entity';

const TitleSchema = text(80);

export interface PageProps {
  id: string;
  type: PageType;
  title: string;
  slug: Slug;
  sections: readonly Section[];
}

/**
 * A route within a storefront, and the ordered sections that render it.
 *
 * `sections` carries no `position` field: the array is the order. A position column exists
 * in the database because rows have no order of their own, and the repository writes the
 * index into it — one direction, so the two can never disagree.
 */
export class Page {
  private constructor(
    readonly id: string,
    readonly type: PageType,
    readonly title: string,
    readonly slug: Slug,
    readonly sections: readonly Section[],
  ) {}

  static create(props: PageProps): Page {
    ensure(props.id.length > 0, 'A page needs an id.');
    ensure(
      props.sections.length > 0,
      `The ${props.type} page has no sections, so it would render as an empty document.`,
    );

    const duplicate = firstDuplicateId(props.sections);
    ensure(
      duplicate === null,
      `The ${props.type} page lists the same section twice (id "${duplicate}").`,
    );

    return new Page(
      props.id,
      parseOrThrow(PageTypeSchema, props.type, 'type'),
      parseOrThrow(TitleSchema, props.title, 'title'),
      props.slug,
      [...props.sections],
    );
  }

  /**
   * The section and where it sits, because "which section" and "which position" are one
   * lookup: the editor patches a section and the client re-renders it in place, and two
   * separate scans for those two answers is how they end up disagreeing.
   */
  findSection(sectionId: string): SectionLocation | null {
    const position = this.sections.findIndex(
      (section) => section.id === sectionId,
    );
    const section = this.sections[position];
    return section === undefined ? null : { section, position };
  }
}

export interface SectionLocation {
  readonly section: Section;
  /** Its index in the page, which is what the DTO calls `position`. */
  readonly position: number;
}

function firstDuplicateId(sections: readonly Section[]): string | null {
  const seen = new Set<string>();
  for (const section of sections) {
    if (seen.has(section.id)) {
      return section.id;
    }
    seen.add(section.id);
  }
  return null;
}
