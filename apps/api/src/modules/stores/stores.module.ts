import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { STORE_REPOSITORY } from './domain/ports/store.repository.port';
import { GetStoreUseCase } from './application/use-cases/get-store.use-case';
import { GetStorefrontUseCase } from './application/use-cases/get-storefront.use-case';
import { ListStoresUseCase } from './application/use-cases/list-stores.use-case';
import { SaveStoreUseCase } from './application/use-cases/save-store.use-case';
import { UpdateSectionUseCase } from './application/use-cases/update-section.use-case';
import { PrismaStoreRepository } from './infrastructure/prisma-store.repository';
import { StoresController } from './presentation/stores.controller';

/**
 * The one line that decides what satisfies the port (architecture.md §4). Every use case
 * above names `StoreRepositoryPort` and none of them can see this file, so pointing the
 * token at a different adapter is the whole of swapping the database.
 */
@Module({
  imports: [PrismaModule],
  controllers: [StoresController],
  providers: [
    { provide: STORE_REPOSITORY, useClass: PrismaStoreRepository },
    ListStoresUseCase,
    GetStoreUseCase,
    GetStorefrontUseCase,
    SaveStoreUseCase,
    UpdateSectionUseCase,
  ],
})
export class StoresModule {}
