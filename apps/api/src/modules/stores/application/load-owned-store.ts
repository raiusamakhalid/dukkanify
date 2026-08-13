import {
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors/domain.error';
import type { Store } from '../domain/entities/store.entity';
import type { StoreRepositoryPort } from '../domain/ports/store.repository.port';

/**
 * Load a store the caller is allowed to touch, or fail with the right answer.
 *
 * Three use cases need this and the distinction they all have to get right is the same one:
 * a store that does not exist is a 404, and a store that exists but belongs to someone else
 * is a 403 (architecture.md §10). Written once, so there is one place to read to know the
 * rule and one place to change it — and no chance of the third caller quietly returning 404
 * for both because it filtered the query by owner.
 */
export async function loadOwnedStore(
  stores: StoreRepositoryPort,
  storeId: string,
  requesterId: string,
): Promise<Store> {
  const store = await stores.findById(storeId);
  if (store === null) {
    throw new NotFoundError('Store', storeId);
  }
  if (!store.isOwnedBy(requesterId)) {
    throw new ForbiddenError('This store belongs to another account.');
  }
  return store;
}
