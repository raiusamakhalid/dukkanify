import { Inject, Injectable } from '@nestjs/common';
import type { Store } from '../../domain/entities/store.entity';
import {
  STORE_REPOSITORY,
  type StoreRepositoryPort,
} from '../../domain/ports/store.repository.port';
import { loadOwnedStore } from '../load-owned-store';

export interface DeleteStoreInput {
  storeId: string;
  requesterId: string;
}

/**
 * Removes a store the caller owns.
 *
 * Load-then-delete rather than `delete where ownerId`, so a miss is a 404 and someone
 * else's store is a 403 — the same answers as every other write on this aggregate.
 */
@Injectable()
export class DeleteStoreUseCase {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepositoryPort,
  ) {}

  async execute(input: DeleteStoreInput): Promise<Store> {
    const store = await loadOwnedStore(
      this.stores,
      input.storeId,
      input.requesterId,
    );
    await this.stores.delete(store.id);
    return store;
  }
}
