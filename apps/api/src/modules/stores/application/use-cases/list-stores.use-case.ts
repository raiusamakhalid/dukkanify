import { Inject, Injectable } from '@nestjs/common';
import {
  STORE_REPOSITORY,
  type StoreRepositoryPort,
  type StoreSummary,
} from '../../domain/ports/store.repository.port';

export interface ListStoresInput {
  ownerId: string;
}

/**
 * The dashboard's list, newest first.
 *
 * This is the one read that *is* scoped by owner, because "my stores" is the question being
 * asked — not an authorisation check applied to a store someone named.
 */
@Injectable()
export class ListStoresUseCase {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepositoryPort,
  ) {}

  execute(input: ListStoresInput): Promise<readonly StoreSummary[]> {
    return this.stores.listByOwner(input.ownerId);
  }
}
