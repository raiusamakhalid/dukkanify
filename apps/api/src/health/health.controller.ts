import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
}

/**
 * The whole of the database this endpoint needs. Narrowing the dependency to one method is
 * what lets a test supply a two-line stub instead of impersonating a Prisma client — the
 * injection token stays `PrismaService`, only the compile-time surface shrinks.
 */
export type DatabaseProbe = Pick<PrismaService, 'checkConnection'>;

/**
 * Liveness, plus whether the database answers.
 *
 * Always 200 when the process is serving: this reports that the API is alive and describes
 * what it can reach. Splitting liveness from readiness — where an unreachable database
 * should return 503 so an orchestrator stops routing traffic — needs a deployment target to
 * design against, and there isn't one yet.
 */
@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    @Inject(PrismaService) private readonly database: DatabaseProbe,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness and database connectivity' })
  @ApiOkResponse({
    description: 'The API is serving; `database` reports whether it answers.',
  })
  async check(): Promise<HealthStatus> {
    const reachable = await this.database.checkConnection();
    return {
      status: reachable ? 'ok' : 'degraded',
      database: reachable ? 'up' : 'down',
    };
  }
}
