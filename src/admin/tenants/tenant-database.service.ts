import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_TICKET_CATEGORIES,
  DEFAULT_KB_CATEGORIES,
} from './data/tenant-seed.data';

@Injectable()
export class TenantDatabaseService {
  private readonly logger = new Logger(TenantDatabaseService.name);

  private getPgServerConfig() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }
    const dbUrl = new URL(process.env.DATABASE_URL);
    return {
      host: dbUrl.hostname,
      port: Number(dbUrl.port) || 5432,
      user: decodeURIComponent(dbUrl.username),
      password: decodeURIComponent(dbUrl.password),
    };
  }

  // Creates a new PostgreSQL database for a tenant
  async createDatabase(dbName: string): Promise<void> {
    const rootClient = new Client({
      ...this.getPgServerConfig(),
      database: 'postgres',
    });

    try {
      await rootClient.connect();
      const escapedDbName = rootClient.escapeIdentifier(dbName);

      const dbCheck = await rootClient.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [dbName],
      );

      if (dbCheck.rowCount === 0) {
        await rootClient.query(`CREATE DATABASE ${escapedDbName}`);
      }
    } finally {
      await rootClient.end();
    }
  }

  // Drops a tenant database (used for atomic rollback on provisioning failure).
  async dropDatabase(dbName: string): Promise<void> {
    const rootClient = new Client({
      ...this.getPgServerConfig(),
      database: 'postgres',
    });

    try {
      await rootClient.connect();
      const escapedDbName = rootClient.escapeIdentifier(dbName);
      await rootClient.query(
        `DROP DATABASE IF EXISTS ${escapedDbName} WITH (FORCE)`,
      );
    } catch (err: any) {
      this.logger.error(err);
    } finally {
      await rootClient.end();
    }
  }

  // Applies schema migrations and initial seed data to a tenant database.
  async setupTenantDatabase(dbName: string): Promise<void> {
    const tenantDbClient = new Client({
      ...this.getPgServerConfig(),
      database: dbName,
    });

    try {
      await tenantDbClient.connect();
      await tenantDbClient.query('BEGIN');

      await this.applyMigrations(tenantDbClient);

      await this.applySeedData(tenantDbClient);

      await tenantDbClient.query('COMMIT');
    } catch (err: any) {
      await tenantDbClient.query('ROLLBACK').catch(() => {});
      this.logger.error(err);
      throw err;
    } finally {
      await tenantDbClient.end();
    }
  }

  private async applyMigrations(client: Client): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "schema_migrations" (
        "version" VARCHAR(50) PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = path.join(
      process.cwd(),
      'prisma',
      'tenant-migrations',
    );
    if (!fs.existsSync(migrationsDir)) return;

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      await client.query(
        'INSERT INTO "schema_migrations" (version, name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [version, file],
      );
    }
  }

  private async applySeedData(client: Client): Promise<void> {
    // Default Departments
    for (const dept of DEFAULT_DEPARTMENTS) {
      await client.query(
        `INSERT INTO "departments" ("name", "description", "is_active", "updated_at")
         VALUES ($1, $2, true, NOW())
         ON CONFLICT DO NOTHING`,
        [dept.name, dept.description],
      );
    }

    // Default Ticket Categories
    for (const cat of DEFAULT_TICKET_CATEGORIES) {
      await client.query(
        `INSERT INTO "ticket_categories" ("name", "description", "is_archived", "updated_at")
         VALUES ($1, $2, false, NOW())
         ON CONFLICT DO NOTHING`,
        [cat.name, cat.description],
      );
    }

    // Default Knowledge Base Categories
    for (const kb of DEFAULT_KB_CATEGORIES) {
      await client.query(
        `INSERT INTO "kb_categories" ("name", "description", "is_archived", "updated_at")
         VALUES ($1, $2, false, NOW())
         ON CONFLICT DO NOTHING`,
        [kb.name, kb.description],
      );
    }
  }
}
