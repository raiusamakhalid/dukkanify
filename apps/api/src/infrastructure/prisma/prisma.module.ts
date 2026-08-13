import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * architecture.md §12 requires `process.env` to be read in exactly one file. This is that
 * file: everything else receives the connection string, and the factory below is the single
 * seam to re-point once the typed configuration module owns environment parsing.
 */
function readDatabaseUrl(): string {
  const url = process.env['DATABASE_URL'];
  if (url === undefined || url.trim().length === 0) {
    throw new Error(
      'DATABASE_URL is not set. Copy apps/api/.env.example to apps/api/.env and set it.',
    );
  }
  return url;
}

@Module({
  providers: [
    {
      provide: PrismaService,
      useFactory: (): PrismaService => new PrismaService(readDatabaseUrl()),
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
