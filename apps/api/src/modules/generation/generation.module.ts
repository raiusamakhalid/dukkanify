import { Module } from '@nestjs/common';
import { AppConfig } from '../../config/configuration';
import { StoresModule } from '../stores/stores.module';
import {
  AI_GENERATOR,
  type AiGeneratorPort,
} from './domain/ports/ai-generator.port';
import { BlueprintRepairService } from './application/services/blueprint-repair.service';
import { GenerateStoreUseCase } from './application/use-cases/generate-store.use-case';
import { ClaudeGenerator } from './infrastructure/providers/claude.generator';
import { MockGenerator } from './infrastructure/providers/mock.generator';
import { GenerationController } from './presentation/generation.controller';

/**
 * Both adapters are imported unconditionally and the factory picks one (architecture.md §4).
 *
 * A conditional `import()` would make the choice invisible to the type checker and to
 * anyone reading the file, and would mean the mock provider — the thing the whole frontend
 * is developed against — is only ever compiled on some machines.
 */
@Module({
  imports: [StoresModule],
  controllers: [GenerationController],
  providers: [
    {
      provide: AI_GENERATOR,
      inject: [AppConfig],
      useFactory: (config: AppConfig): AiGeneratorPort => {
        switch (config.ai.provider) {
          case 'claude':
            return new ClaudeGenerator(config);
          case 'mock':
            return new MockGenerator();
          default:
            // `gemini` is a valid value of AI_PROVIDER (§14 lists the adapter as out of
            // scope) so boot fails here with a sentence rather than at the first prompt
            // with an injection error.
            throw new Error(
              `No generator is implemented for AI_PROVIDER="${config.ai.provider}". Use "mock" or "claude".`,
            );
        }
      },
    },
    BlueprintRepairService,
    GenerateStoreUseCase,
  ],
})
export class GenerationModule {}
