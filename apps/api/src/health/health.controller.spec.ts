import { describe, expect, it } from 'vitest';
import {
  HealthController,
  type DatabaseProbe,
  type HealthStatus,
} from './health.controller';

/** No cast and no mocking library: the dependency is one method, so the stub is one method. */
function databaseReporting(reachable: boolean): DatabaseProbe {
  return {
    checkConnection: (): Promise<boolean> => Promise.resolve(reachable),
  };
}

describe('HealthController', () => {
  it('reports ok when the database answers', async () => {
    const controller = new HealthController(databaseReporting(true));

    const result: HealthStatus = await controller.check();

    expect(result).toEqual({ status: 'ok', database: 'up' });
  });

  it('reports degraded rather than failing when the database does not answer', async () => {
    const controller = new HealthController(databaseReporting(false));

    const result: HealthStatus = await controller.check();

    expect(result).toEqual({ status: 'degraded', database: 'down' });
  });
});
