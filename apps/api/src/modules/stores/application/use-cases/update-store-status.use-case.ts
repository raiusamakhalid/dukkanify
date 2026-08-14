import { Inject, Injectable } from '@nestjs/common';
import type { StoreStatus } from '@dukkanify/contracts';
import type { Store } from '../../domain/entities/store.entity';
import {
  STORE_REPOSITORY,
  type StoreRepositoryPort,
} from '../../domain/ports/store.repository.port';
import { loadOwnedStore } from '../load-owned-store';

export interface UpdateStoreStatusInput {
  storeId: string;
  requesterId: string;
  status: StoreStatus;
}

/**
 * One write for both directions of the store lifecycle.
 *
 * The conditions (a catalogue to go live, always allowed to return to draft) live on the
 * aggregate. This use case only proves who may ask, then persists whatever `withStatus`
 * accepted — so a later rule does not need a second endpoint.
 */
@Injectable()
export class UpdateStoreStatusUseCase {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepositoryPort,
  ) {}

  async execute(input: UpdateStoreStatusInput): Promise<Store> {
    const store = await loadOwnedStore(
      this.stores,
      input.storeId,
      input.requesterId,
    );
    const next = store.withStatus(input.status);
    if (next === store) {
      return store;
    }
    return this.stores.save(next);
  }
}
