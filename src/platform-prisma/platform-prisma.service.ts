import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/platform-prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { RequestContext } from '../common/context/request-context';

const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'secret',
  'client_secret',
  'plain_client_secret',
  'authorization',
  'access_token',
  'refresh_token',
]);

const AUDITABLE_OPERATIONS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
]);

function sanitizeDetails(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeDetails);

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeDetails(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function extractSummary(result: any): string | null {
  if (!result) return null;
  if (typeof result.id !== 'undefined') return `id: ${result.id}`;
  if (typeof result.count !== 'undefined') return `count: ${result.count}`;
  return null;
}

@Injectable()
export class PlatformPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    const pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;

    return this.createExtendedClient(pool);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }

  private createExtendedClient(pool: Pool) {
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
              const userId = RequestContext.getUserId() || null;
              const ipAddress = RequestContext.getIp();
              const action = `${(model || 'UNKNOWN').toUpperCase()}_${operation.toUpperCase()}`;
              const sanitizedArgs = sanitizeDetails(args);
              const summary = extractSummary(result);

              pool
                .query(
                  `INSERT INTO platform_audit_logs (action, user_id, details, ip_address, created_at) VALUES ($1, $2, $3, $4, NOW())`,
                  [
                    action,
                    userId,
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
}
