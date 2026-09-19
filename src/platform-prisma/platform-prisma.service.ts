import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/platform-prisma/client';

@Injectable()
export class PlatformPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PlatformPrismaService.name);
  private pool: Pool;

  constructor() {
    const connectionString =
      process.env.PLATFORM_DATABASE_URL ||
      'postgresql://postgres:root@127.0.0.1:5432/crm_platform_db?schema=public';

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log(
        '✅ Connected to Central Platform Database (crm_platform_db)',
      );
    } catch (error) {
      this.logger.error(
        '❌ Failed to connect to Central Platform Database',
        error,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
    this.logger.log('Disconnected from Central Platform Database');
  }
}