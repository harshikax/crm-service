#!/usr/bin/env node
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function getPgConfig() {
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

function getMigrationFiles() {
  const migrationsDir = path.join(process.cwd(), 'prisma', 'tenant-migrations');
  if (!fs.existsSync(migrationsDir)) return [];

  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => {
      const match = file.match(/^([0-9a-zA-Z_-]+)_(.+)\.sql$/);
      const version = match ? match[1] : file.replace(/\.sql$/, '');
      const name = match ? match[2] : file;
      return {
        version,
        name,
        fullPath: path.join(migrationsDir, file),
      };
    });
}

async function migrateTenant(pgConfig, dbName, migrations) {
  const client = new Client({ ...pgConfig, database: dbName });
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
            [m.version, m.name]
          );
          await client.query('COMMIT');
          applied.push(m.version);
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }
    }
  } finally {
    await client.end();
  }

  return applied;
}

async function run() {
  console.log('🚀 Running schema migrations across all tenant databases...\n');
  const pgConfig = getPgConfig();
  const migrations = getMigrationFiles();

  if (migrations.length === 0) {
    console.log('No migration files found in prisma/tenant-migrations/.');
    return;
  }

  console.log(`Found ${migrations.length} migration(s):`, migrations.map((m) => m.version).join(', '));

  // Connect to Central Platform DB to fetch active tenants
  const defaultDbName =
    new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '') ||
    'postgres';
  const platClient = new Client({ ...pgConfig, database: defaultDbName });
  await platClient.connect();
  const tenantsRes = await platClient.query(
    'SELECT id, slug, db_name FROM "tenants" WHERE "status" = \'ACTIVE\'',
  );
  await platClient.end();

  const activeTenants = tenantsRes.rows;
  console.log(`Found ${activeTenants.length} active tenant database(s).\n`);

  for (const tenant of activeTenants) {
    process.stdout.write(`Migrating '${tenant.db_name}' (${tenant.slug})... `);
    try {
      const applied = await migrateTenant(pgConfig, tenant.db_name, migrations);
      if (applied.length > 0) {
        console.log(`✅ Applied: ${applied.join(', ')}`);
      } else {
        console.log(`ℹ️ Up to date`);
      }
    } catch (err) {
      console.log(`❌ Failed: ${err.message}`);
    }
  }

  console.log('\n🏁 Multi-tenant migrations complete!\n');
}

run().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});

