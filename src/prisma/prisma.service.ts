import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/tenant-prisma/client';
import { RequestContext } from '../common/context/request-context';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly clientPool = new Map<
    string,
    { client: PrismaClient; pool: Pool }
  >();
  private defaultDbUrl: string;

  constructor() {
    const defaultDbUrl = process.env.DATABASE_URL;
    if (!defaultDbUrl) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    const defaultPool = new Pool({ connectionString: defaultDbUrl });
    const defaultAdapter = new PrismaPg(defaultPool);
    super({ adapter: defaultAdapter });

    this.defaultDbUrl = defaultDbUrl;

    return new Proxy(this, {
      get: (target: any, prop: string | symbol) => {
        if (
          prop in target &&
          typeof target[prop] === 'function' &&
          ['getClient', 'onModuleInit', 'onModuleDestroy'].includes(
            prop as string,
          )
        ) {
          return target[prop].bind(target);
        }
        const client = target.getClient();
        const value = client[prop];
        if (typeof value === 'function') {
          return value.bind(client);
        }
        return value;
      },
    });
  }

  public getClient(dbName?: string): PrismaClient {
    const targetDbName = dbName || RequestContext.getDbName();
    if (!targetDbName) {
      const url = new URL(this.defaultDbUrl);
      const defaultDbName = url.pathname.replace(/^\//, '') || 'postgres';
      return this.getOrCreateClient(defaultDbName);
    }
    return this.getOrCreateClient(targetDbName);
  }

  private getOrCreateClient(dbName: string): PrismaClient {
    if (this.clientPool.has(dbName)) {
      return this.clientPool.get(dbName)!.client;
    }

    const url = new URL(this.defaultDbUrl);
    url.pathname = `/${dbName}`;
    const connectionString = url.toString();

    const pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    const adapter = new PrismaPg(pool);
    const client = new PrismaClient({ adapter });

    this.clientPool.set(dbName, { client, pool });
    this.logger.log(`Initialized dynamic connection pool for tenant DB '${dbName}'`);
    return client;
  }

  async onModuleInit() {
    this.logger.log('PrismaService initialized with Dynamic Tenant DB Pooling');
  }

  async onModuleDestroy() {
    for (const [_dbName, { client, pool }] of this.clientPool.entries()) {
      await client.$disconnect().catch(() => {});
      await pool.end().catch(() => {});
    }
    this.clientPool.clear();
  }
}

