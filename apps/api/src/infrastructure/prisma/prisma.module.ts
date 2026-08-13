import { Module } from '@nestjs/common';
import { AppConfig } from '../../config/configuration';
import { PrismaService } from './prisma.service';

@Module({
  providers: [
    {
      provide: PrismaService,
      inject: [AppConfig],
      // The connection string arrives already validated, so an unset or malformed
      // DATABASE_URL fails in env.validation.ts with every other configuration problem
      // rather than here, one variable at a time.
      useFactory: (config: AppConfig): PrismaService =>
        new PrismaService(config.database.url),
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
