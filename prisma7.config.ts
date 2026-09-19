import "dotenv/config";
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/platform.prisma',

  datasource: {
    url: process.env.PLATFORM_DATABASE_URL,
  },
});