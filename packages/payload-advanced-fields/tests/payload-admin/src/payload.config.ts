import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { buildConfig } from 'payload';
import { FieldShowcases } from './collections/FieldShowcases';
import { Users } from './collections/Users';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const connectionString =
  process.env.DATABASE_URL ??
  'postgres://payload_fields_test:payload_fields_test@127.0.0.1:55432/payload_fields_test';
const databaseName = new URL(connectionString).pathname.replace(/^\//, '');

if (databaseName !== 'payload_fields_test') {
  throw new Error('The Payload field test app only runs against the dedicated payload_fields_test database.');
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname, '..') },
  },
  collections: [Users, FieldShowcases],
  secret: process.env.PAYLOAD_SECRET ?? 'payload-fields-fixture-secret-change-me',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: {
      connectionString,
      max: 2,
    },
  }),
});
