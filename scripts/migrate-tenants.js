#!/usr/bin/env node
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const CONCURRENCY_LIMIT = 5;

function getPgConfig() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in environment variables');
  }
  const dbUrl = new URL(connectionString);
  return {
    host: dbUrl.hostname,
    port: Number(dbUrl.port) || 5432,
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    defaultDbName: dbUrl.pathname.replace(/^\//, '') || 'postgres',
  };
}

function getMigrationFiles() {
  const migrationsDir = path.join(process.cwd(), 'prisma', 'tenant-migrations');
  if (!fs.existsSync(migrationsDir)) return [];

  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => ({
      version: file.replace(/\.sql$/, ''),
      name: file,
      fullPath: path.join(migrationsDir, file),
    }));
}

async function migrateSingleTenant(pgConfig, tenant, migrations) {
  const client = new Client({
    host: pgConfig.host,
    port: pgConfig.port,
    user: pgConfig.user,
    password: pgConfig.password,
    database: tenant.db_name,
  });

  const applied = [];

  try {
    await client.connect();

    await client.query(`
      CREATE TABLE IF NOT EXISTS "schema_migrations" (
        "version" VARCHAR(50) PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const res = await client.query('SELECT version FROM "schema_migrations"');
    const appliedSet = new Set(res.rows.map((r) => r.version));

    for (const m of migrations) {
      if (!appliedSet.has(m.version)) {
        const sql = fs.readFileSync(m.fullPath, 'utf8');
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query(
            'INSERT INTO "schema_migrations" (version, name, applied_at) VALUES ($1, $2, NOW())',
            [m.version, m.name],
          );
          await client.query('COMMIT');
          applied.push(m.version);
        } catch (err) {
          await client.query('ROLLBACK').catch(() => {});
          throw err;
        }
      }
    }

    return { success: true, tenant, applied };
  } catch (err) {
    return { success: false, tenant, error: err.message || String(err) };
  } finally {
    await client.end().catch(() => {});
  }
}

// Concurrency helper to run migrations in controlled parallel batches
async function runWithConcurrency(items, limit, fn) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      const result = await fn(item);
      results[currentIndex] = result;
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function run() {
  console.log('🚀 [Multi-Tenant Migration Runner] Starting schema migration across tenants...\n');

  const pgConfig = getPgConfig();
  const migrations = getMigrationFiles();

  if (migrations.length === 0) {
    console.log('⚠️  No migration files found in prisma/tenant-migrations/.');
    return;
  }

  console.log(
    `📂 Found ${migrations.length} migration file(s): ${migrations.map((m) => m.version).join(', ')}\n`,
  );

  // Fetch ACTIVE and SUSPENDED tenants (skip ARCHIVED)
  const platClient = new Client({
    host: pgConfig.host,
    port: pgConfig.port,
    user: pgConfig.user,
    password: pgConfig.password,
    database: pgConfig.defaultDbName,
  });

  let tenants = [];
  try {
    await platClient.connect();
    const result = await platClient.query(
      `SELECT id, slug, db_name, status 
       FROM "tenants" 
       WHERE "status" IN ('ACTIVE', 'SUSPENDED') 
       ORDER BY id ASC`,
    );
    tenants = result.rows;
  } finally {
    await platClient.end().catch(() => {});
  }

  if (tenants.length === 0) {
    console.log('ℹ️  No active or suspended tenants found to migrate.');
    return;
  }

  console.log(
    `👥 Found ${tenants.length} target tenant database(s) (Concurrency limit: ${CONCURRENCY_LIMIT})...\n`,
  );

  const results = await runWithConcurrency(tenants, CONCURRENCY_LIMIT, async (tenant) => {
    const result = await migrateSingleTenant(pgConfig, tenant, migrations);
    if (result.success) {
      if (result.applied.length > 0) {
        console.log(`✅ [${tenant.status}] ${tenant.slug} (${tenant.db_name}) ➔ Applied: ${result.applied.join(', ')}`);
      } else {
        console.log(`ℹ️ [${tenant.status}] ${tenant.slug} (${tenant.db_name}) ➔ Up to date`);
      }
    } else {
      console.log(`❌ [${tenant.status}] ${tenant.slug} (${tenant.db_name}) ➔ Failed: ${result.error}`);
    }
    return result;
  });

  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log('\n==================== MIGRATION SUMMARY ====================');
  console.log(`Total target tenants: ${tenants.length}`);
  console.log(`✅ Succeeded: ${succeeded.length}`);
  console.log(`❌ Failed:    ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed tenants:');
    for (const f of failed) {
      console.log(`  - ${f.tenant.slug} (${f.tenant.db_name}): ${f.error}`);
    }
  }
  console.log('===========================================================\n');

  if (failed.length > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal runner error:', err.message || err);
  process.exit(1);
});
