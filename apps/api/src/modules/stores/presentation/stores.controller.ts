import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type SaveStoreRequest,
  SaveStoreRequestSchema,
  type SectionDto,
  type StoreDto,
  type StoreSummaryDto,
  type UpdateSectionRequest,
  UpdateSectionRequestSchema,
  type UpdateStoreStatusRequest,
  UpdateStoreStatusRequestSchema,
} from '@dukkanify/contracts';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  toSectionDto,
  toStoreDto,
  toStoreSummaryDto,
} from '../application/mappers/store.mapper';
import { DeleteStoreUseCase } from '../application/use-cases/delete-store.use-case';
import { GetStoreUseCase } from '../application/use-cases/get-store.use-case';
import { GetStorefrontUseCase } from '../application/use-cases/get-storefront.use-case';
import { ListStoresUseCase } from '../application/use-cases/list-stores.use-case';
import {
  MANUAL_PROMPT_VERSION,
  SaveStoreUseCase,
} from '../application/use-cases/save-store.use-case';
import { UpdateSectionUseCase } from '../application/use-cases/update-section.use-case';
import { UpdateStoreStatusUseCase } from '../application/use-cases/update-store-status.use-case';

const saveStoreBody = new ZodValidationPipe(SaveStoreRequestSchema);
const updateSectionBody = new ZodValidationPipe(UpdateSectionRequestSchema);
const updateStatusBody = new ZodValidationPipe(UpdateStoreStatusRequestSchema);

/**
 * Every handler: validate, call one use case, map the result. No branch, no rule, no query.
 *
 * `@ApiBearerAuth()` is per route rather than on the class so the documentation tells the
 * truth about the one route that is open — a padlock on the public storefront would be a
 * small lie that costs an integrator an afternoon.
 */
@ApiTags('stores')
@Controller({ version: '1' })
export class StoresController {
  constructor(
    private readonly listStores: ListStoresUseCase,
    private readonly getStore: GetStoreUseCase,
    private readonly getStorefront: GetStorefrontUseCase,
    private readonly saveStore: SaveStoreUseCase,
    private readonly updateSection: UpdateSectionUseCase,
    private readonly updateStatus: UpdateStoreStatusUseCase,
    private readonly deleteStore: DeleteStoreUseCase,
  ) {}

  @ApiBearerAuth()
  @Get('store')
  @ApiOperation({ summary: "The signed-in user's stores, newest first" })
  async list(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StoreSummaryDto[]> {
    const stores = await this.listStores.execute({ ownerId: user.id });
    return stores.map(toStoreSummaryDto);
  }

  @ApiBearerAuth()
  @Post('store')
  @ApiOperation({
    summary: 'Persist a store the client holds, or replace one it owns',
  })
  async save(
    @CurrentUser() user: AuthenticatedUser,
    @Body(saveStoreBody) body: SaveStoreRequest,
  ): Promise<StoreDto> {
    const store = await this.saveStore.execute({
      ownerId: user.id,
      prompt: body.prompt,
      promptVersion: MANUAL_PROMPT_VERSION,
      blueprint: body.blueprint,
      ...(body.storeId === undefined ? {} : { storeId: body.storeId }),
    });
    return toStoreDto(store);
  }

  @ApiBearerAuth()
  @Get('store/:storeId')
  @ApiOperation({
    summary: 'One store, with its pages, sections and catalogue',
  })
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('storeId') storeId: string,
  ): Promise<StoreDto> {
    const store = await this.getStore.execute({
      storeId,
      requesterId: user.id,
    });
    return toStoreDto(store);
  }

  @ApiBearerAuth()
  @Patch('store/:storeId/sections/:sectionId')
  @ApiOperation({
    summary: 'Replace one section’s content — the inline editor',
  })
  async patchSection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('storeId') storeId: string,
    @Param('sectionId') sectionId: string,
    @Body(updateSectionBody) body: UpdateSectionRequest,
  ): Promise<SectionDto> {
    const located = await this.updateSection.execute({
      storeId,
      sectionId,
      requesterId: user.id,
      content: body.content,
    });
    return toSectionDto(located.section, located.position);
  }

  @ApiBearerAuth()
  @Patch('store/:storeId/status')
  @ApiOperation({
    summary: 'Publish a store or return it to draft',
  })
  async patchStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('storeId') storeId: string,
    @Body(updateStatusBody) body: UpdateStoreStatusRequest,
  ): Promise<StoreDto> {
    const store = await this.updateStatus.execute({
      storeId,
      requesterId: user.id,
      status: body.status,
    });
    return toStoreDto(store);
  }

  @ApiBearerAuth()
  @Delete('store/:storeId')
  @ApiOperation({ summary: 'Delete a store the caller owns' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('storeId') storeId: string,
  ): Promise<StoreSummaryDto> {
    const store = await this.deleteStore.execute({
      storeId,
      requesterId: user.id,
    });
    return toStoreSummaryDto(store);
  }

  @Public()
  @Get('storefront/:slug')
  @ApiOperation({ summary: 'Public storefront render data, by slug' })
  async storefront(@Param('slug') slug: string): Promise<StoreDto> {
    return toStoreDto(await this.getStorefront.execute({ slug }));
  }
}
