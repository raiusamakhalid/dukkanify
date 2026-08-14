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
import { GeminiGenerator } from './infrastructure/providers/gemini.generator';
import { MockGenerator } from './infrastructure/providers/mock.generator';
import { RetryingGenerator } from './infrastructure/providers/retrying.generator';
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
          // Only the networked adapters are wrapped: the mock has nothing transient to fail.
          case 'claude':
            return new RetryingGenerator(new ClaudeGenerator(config));
          case 'gemini':
            return new RetryingGenerator(new GeminiGenerator(config));
          case 'mock':
            return new MockGenerator();
        }
      },
    },
    BlueprintRepairService,
    GenerateStoreUseCase,
  ],
})
export class GenerationModule {}
