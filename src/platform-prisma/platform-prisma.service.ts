import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/platform-prisma/client';
import { RequestContext } from '../common/context/request-context';

const SENSITIVE_KEYS = new Set([
  'password',
  'salt',
  'client_secret',
  'token',
  'secret',
  'refresh_token',
  'apikey',
  'api_key',
]);

const AUDITABLE_OPERATIONS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
]);

function sanitizeDetails(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeDetails);

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeDetails(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function extractSummary(result: unknown): Record<string, unknown> | undefined {
  if (!result || typeof result !== 'object') return undefined;
  if (Array.isArray(result)) return { count: result.length };

  const record = result as Record<string, unknown>;
  const summary: Record<string, unknown> = {};
  if ('id' in record) summary.id = record.id;
  if ('name' in record) summary.name = record.name;
  if ('email' in record) summary.email = record.email;
  if ('slug' in record) summary.slug = record.slug;
  if ('code' in record) summary.code = record.code;

  return Object.keys(summary).length > 0 ? summary : undefined;
}

@Injectable()
export class PlatformPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PlatformPrismaService.name);
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not defined in environment variables',
      );
    }

    const pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    const adapter = new PrismaPg(pool);

    super({ adapter });
    this.pool = pool;

    const extended = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const result = await query(args);

            if (
              model === 'platform_audit_logs' ||
              !AUDITABLE_OPERATIONS.has(operation)
            ) {
              return result;
            }

            try {
              const actor = RequestContext.getActor();
              const ipAddress = RequestContext.getIp();
              const action = `${(model || 'UNKNOWN').toUpperCase()}_${operation.toUpperCase()}`;
              const sanitizedArgs = sanitizeDetails(args);
              const summary = extractSummary(result);

              pool
                .query(
                  `INSERT INTO platform_audit_logs (action, actor, details, ip_address, created_at) VALUES ($1, $2, $3, $4, NOW())`,
                  [
                    action,
                    actor,
                    JSON.stringify({
                      operation,
                      model,
                      args: sanitizedArgs,
                      summary,
                    }),
                    ipAddress || null,
                  ],
                )
                .catch(() => {});
            } catch {}

            return result;
          },
        },
      },
    });

    return extended as any;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log(
        'Connected to Central Platform Database (crm_platform_db)',
      );
    } catch (error) {
      this.logger.error(
        'Failed to connect to Central Platform Database',
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