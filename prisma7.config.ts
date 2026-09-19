import "dotenv/config";
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/platform.prisma',

  datasource: {
    url: process.env.DATABASE_URL,
  },
});