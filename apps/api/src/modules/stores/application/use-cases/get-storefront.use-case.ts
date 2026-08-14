import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors/domain.error';
import type { Store } from '../../domain/entities/store.entity';
import {
  STORE_REPOSITORY,
  type StoreRepositoryPort,
} from '../../domain/ports/store.repository.port';
import { Slug } from '../../domain/value-objects/slug.vo';

export interface GetStorefrontInput {
  slug: string;
}

/**
 * The public storefront, by slug.
 *
 * A use case of its own rather than a branch inside `GetStoreUseCase`: the lookup key is
 * different and, more importantly, so is the authorisation — there is no requester to check
 * anything against. One `execute` with a union input would be two use cases wearing one hat,
 * and the half that skips the ownership check is the half worth being able to read alone.
 *
 * Only published stores are served. A draft still exists for its owner in the builder; the
 * public URL must not leak that a shop is being prepared.
 */
@Injectable()
export class GetStorefrontUseCase {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepositoryPort,
  ) {}

  async execute(input: GetStorefrontInput): Promise<Store> {
    // A malformed slug is a bad request, not a miss: `Slug` refuses it before a query runs.
    const store = await this.stores.findBySlug(Slug.create(input.slug));
    if (store === null || store.status !== 'PUBLISHED') {
      throw new NotFoundError('Storefront', input.slug);
    }
    return store;
  }
}
