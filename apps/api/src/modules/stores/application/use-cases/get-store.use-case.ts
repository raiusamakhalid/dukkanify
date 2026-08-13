import { Inject, Injectable } from '@nestjs/common';
import type { Store } from '../../domain/entities/store.entity';
import {
  STORE_REPOSITORY,
  type StoreRepositoryPort,
} from '../../domain/ports/store.repository.port';
import { loadOwnedStore } from '../load-owned-store';

export interface GetStoreInput {
  storeId: string;
  requesterId: string;
}

/**
 * One store, for the person who owns it.
 *
 * Thin because the whole of "get a store" is the authorisation, and that lives in
 * `loadOwnedStore` where the two other writers of it can share the same answer.
 */
@Injectable()
export class GetStoreUseCase {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepositoryPort,
  ) {}

  execute(input: GetStoreInput): Promise<Store> {
    return loadOwnedStore(this.stores, input.storeId, input.requesterId);
  }
}
