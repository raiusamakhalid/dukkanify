import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type GenerateRequest,
  GenerateRequestSchema,
  type StoreDto,
} from '@dukkanify/contracts';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { toStoreDto } from '../../stores/application/mappers/store.mapper';
import { GenerateStoreUseCase } from '../application/use-cases/generate-store.use-case';

const generateBody = new ZodValidationPipe(GenerateRequestSchema);

/** Five generations a minute per account: a person iterating, not a script enumerating. */
const GENERATIONS_PER_MINUTE = 5;

@ApiTags('generation')
@Controller({ version: '1' })
export class GenerationController {
  constructor(private readonly generateStore: GenerateStoreUseCase) {}

  @ApiBearerAuth()
  @Post('generate')
  // Tightens the global limit for this route only. The global `ScopedThrottlerGuard` keys
  // on the account, so this is five generations per user per minute, not per address.
  @Throttle({ default: { limit: GENERATIONS_PER_MINUTE, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Generate and persist a storefront from a natural-language prompt',
  })
  @ApiCreatedResponse({ description: 'The generated store, ready to render.' })
  @ApiUnprocessableEntityResponse({
    description:
      'The generator could not produce a storefront matching the contract, even after a correction.',
  })
  @ApiTooManyRequestsResponse({
    description: `More than ${String(GENERATIONS_PER_MINUTE)} generations in a minute for this account.`,
  })
  async generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body(generateBody) body: GenerateRequest,
  ): Promise<StoreDto> {
    const store = await this.generateStore.execute({
      ownerId: user.id,
      prompt: body.prompt,
      locale: body.locale,
    });
    return toStoreDto(store);
  }
}
