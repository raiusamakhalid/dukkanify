import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors/domain.error';
import type { SectionLocation } from '../../domain/entities/page.entity';
import {
  STORE_REPOSITORY,
  type StoreRepositoryPort,
} from '../../domain/ports/store.repository.port';
import { loadOwnedStore } from '../load-owned-store';

export interface UpdateSectionInput {
  storeId: string;
  sectionId: string;
  requesterId: string;
  content: unknown;
}

/**
 * The inline editor's write: new content for one section.
 *
 * The store is loaded whole so the section can be located *within it*. Patching by section
 * id alone would let anyone who guesses an id edit a section of a store they do not own —
 * the aggregate is what ties the section to the owner being checked.
 */
@Injectable()
export class UpdateSectionUseCase {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepositoryPort,
  ) {}

  async execute(input: UpdateSectionInput): Promise<SectionLocation> {
    const store = await loadOwnedStore(
      this.stores,
      input.storeId,
      input.requesterId,
    );

    const located = store.findSection(input.sectionId);
    if (located === null) {
      throw new NotFoundError('Section', input.sectionId);
    }

    // The entity validates the new content and refuses a change of section type; this layer
    // only decides who is allowed to ask.
    const section = located.section.withContent(input.content);
    await this.stores.saveSection(store.id, section);

    return { section, position: located.position };
  }
}
