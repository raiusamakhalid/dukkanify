import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * `DIRECT_URL` first, `DATABASE_URL` second.
 *
 * A hosted Postgres is reached through a connection pooler (Neon's `-pooler` host, PgBouncer
 * anywhere else), which is right for a serverless runtime and wrong for a migration: DDL and
 * the advisory lock `migrate deploy` takes both need one session that stays put. Only the
 * migration path reads this file, so pointing it at the unpooled host keeps the two concerns
 * separate without the application knowing there is more than one URL.
 */
const databaseUrl = process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'];

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  // Spread rather than assign: `exactOptionalPropertyTypes` rejects an explicit
  // `undefined`, and `prisma generate` must still run with no database URL (CI).
  // Commands that need a connection fail with Prisma's own named-variable error.
  ...(databaseUrl === undefined ? {} : { datasource: { url: databaseUrl } }),
});
