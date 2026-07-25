import { defineConfig, env } from 'prisma/config';
import { config as loadEnv } from 'dotenv';

loadEnv();

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
