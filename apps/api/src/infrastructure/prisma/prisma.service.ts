import {
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

/**
 * The database connection, and the only class in the application that extends a
 * framework client.
 *
 * Prisma 7 has no bundled query engine: the client reaches PostgreSQL through a driver
 * adapter, so the connection string is a constructor argument rather than something the
 * client discovers from the environment. That is an improvement here — it means this
 * class has no opinion about where configuration comes from, and PrismaModule can be
 * re-pointed at typed configuration without touching it.
 *
 * Deliberately not decorated with `@Injectable()`: it takes a plain string, so it must be
 * constructed by the module's factory. Leaving the decorator off makes an accidental
 * `constructor(private prisma: PrismaService)` in a provider a wiring error at startup
 * rather than a confusing runtime failure.
 */
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(connectionString: string) {
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connected to PostgreSQL');
  }

  /**
   * Nest calls this on SIGTERM once `enableShutdownHooks()` is on, which is what lets
   * in-flight queries finish instead of dying with the process.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL');
  }

  /**
   * Whether the database answers, for the health endpoint. Returns a boolean rather than
   * throwing, because "the database is down" is the answer being asked for — but the reason
   * still reaches the log, since a silent false is impossible to diagnose.
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.warn(
        `Database health check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
