import {
  type SectionContent,
  SectionContentSchema,
  type SectionType,
} from '@dukkanify/contracts';
import { ensure, parseOrThrow } from '../invariants';

export interface SectionProps {
  id: string;
  /** `unknown` because this arrives as a `Json` column or a model's output, never as a type. */
  content: unknown;
}

/**
 * One rendered block of a page: a hero, a product grid, a contact panel.
 *
 * The `type` is a getter over the content's discriminator rather than a field of its own.
 * A stored `type` column that could disagree with the stored content is the bug this
 * shape makes unrepresentable — architecture.md §6 requires the column to be written from
 * the content, and here there is nothing else it could be written from.
 */
export class Section {
  private constructor(
    readonly id: string,
    readonly content: SectionContent,
  ) {}

  static create(props: SectionProps): Section {
    ensure(props.id.length > 0, 'A section needs an id.');
    return new Section(
      props.id,
      parseOrThrow(SectionContentSchema, props.content, 'content'),
    );
  }

  get type(): SectionType {
    return this.content.type;
  }

  /**
   * The inline editor's write path: new content, same section.
   *
   * The type is held fixed. Editing a headline is a content change; turning a hero into a
   * contact panel is a page-structure change, and letting a PATCH of one field do the
   * second silently is how an editor loses someone's layout.
   */
  withContent(content: unknown): Section {
    const parsed = parseOrThrow(SectionContentSchema, content, 'content');
    ensure(
      parsed.type === this.type,
      `A ${this.type} section cannot be turned into a ${parsed.type} section by editing it.`,
    );
    return new Section(this.id, parsed);
  }
}
