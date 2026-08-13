import { type CustomDecorator, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opts a route out of the global authentication guard.
 *
 * Authentication is on by default and waived explicitly, so forgetting the decorator makes a
 * route private — the direction of failure that cannot leak data.
 */
export const Public = (): CustomDecorator<string> =>
  SetMetadata(IS_PUBLIC_KEY, true);
