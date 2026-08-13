import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const databaseUrl = process.env['DATABASE_URL'];

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
