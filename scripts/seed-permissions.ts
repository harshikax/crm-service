import 'dotenv/config';
import { Pool } from 'pg';
import {
  PlatformPermission,
  PLATFORM_PERMISSIONS,
} from '../src/common/enums/platform-permissions.enum';

const BASELINE_OTHER_ROLES = [
  {
    name: 'ADMIN',
    permissions: [
      PlatformPermission.TENANTS_MANAGE,
      PlatformPermission.TENANTS_READ,
      PlatformPermission.APPLICATIONS_MANAGE,
      PlatformPermission.AUDIT_READ,
    ],
  },
  {
    name: 'SUPPORT',
    permissions: [
      PlatformPermission.TENANTS_READ,
      PlatformPermission.AUDIT_READ,
    ],
  },
];

function validateDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is missing.');
  }
  return connectionString;
}

export async function syncDatabaseTables(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      is_system BOOLEAN DEFAULT false NOT NULL,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
    );

    ALTER TABLE platform_roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false NOT NULL;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_users (
      id SERIAL PRIMARY KEY,
      role_id INTEGER NOT NULL REFERENCES platform_roles(id) ON DELETE RESTRICT,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_permission_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);

  const legacyCheck = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'platform_permissions' AND column_name = 'role_id';
  `);

  if (legacyCheck.rows.length > 0) {
    await pool.query(`DROP TABLE IF EXISTS platform_permissions CASCADE;`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_permissions (
      id SERIAL PRIMARY KEY,
      category_id INTEGER REFERENCES platform_permission_categories(id) ON DELETE SET NULL,
      code VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(150),
      description VARCHAR(255),
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);

  const categoryColCheck = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'platform_permissions' AND column_name = 'category_id';
  `);

  if (categoryColCheck.rows.length === 0) {
    await pool.query(`
      ALTER TABLE platform_permissions 
      ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES platform_permission_categories(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS name VARCHAR(150);
    `);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_role_permissions (
      role_id INTEGER NOT NULL REFERENCES platform_roles(id) ON DELETE CASCADE,
      permission_id INTEGER NOT NULL REFERENCES platform_permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );

    CREATE INDEX IF NOT EXISTS platform_role_permissions_permission_id_idx 
    ON platform_role_permissions(permission_id);
  `);
}

export async function seedMasterPermissions(pool: Pool) {
  for (const item of Object.values(PLATFORM_PERMISSIONS)) {
    const categoryResult = await pool.query(
      `INSERT INTO platform_permission_categories (name, created_at, updated_at)
       VALUES ($1, NOW(), NOW())
       ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [item.category],
    );
    const categoryId = categoryResult.rows[0].id;

    await pool.query(
      `INSERT INTO platform_permissions (category_id, code, name, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (code) DO UPDATE 
       SET category_id = EXCLUDED.category_id,
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           updated_at = NOW()`,
      [categoryId, item.code, item.name, item.description],
    );
  }
}

export async function seedRolesAndAutoAssignSuperAdmin(pool: Pool) {
  const superAdminResult = await pool.query(
    `INSERT INTO platform_roles (name, is_system, created_at, updated_at)
     VALUES ('SUPER_ADMIN', true, NOW(), NOW())
     ON CONFLICT (name) DO UPDATE SET is_system = true, updated_at = NOW()
     RETURNING id`,
  );
  const superAdminRoleId = superAdminResult.rows[0].id;

  const allPermissions = await pool.query(
    'SELECT id, code FROM platform_permissions',
  );
  for (const perm of allPermissions.rows) {
    await pool.query(
      `INSERT INTO platform_role_permissions (role_id, permission_id)
       VALUES ($1, $2)
       ON CONFLICT (role_id, permission_id) DO NOTHING`,
      [superAdminRoleId, perm.id],
    );
  }

  for (const roleConfig of BASELINE_OTHER_ROLES) {
    const existing = await pool.query(
      'SELECT id FROM platform_roles WHERE name = $1',
      [roleConfig.name],
    );

    if (existing.rows.length === 0) {
      const inserted = await pool.query(
        'INSERT INTO platform_roles (name, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id',
        [roleConfig.name],
      );
      const newRoleId = inserted.rows[0].id;

      for (const permCode of roleConfig.permissions) {
        const permRow = await pool.query(
          'SELECT id FROM platform_permissions WHERE code = $1',
          [permCode],
        );
        if (permRow.rows.length > 0) {
          await pool.query(
            `INSERT INTO platform_role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT (role_id, permission_id) DO NOTHING`,
            [newRoleId, permRow.rows[0].id],
          );
        }
      }
    }
  }
}

async function main() {
  const connectionString = validateDatabaseUrl();
  const pool = new Pool({ connectionString });

  try {
    await syncDatabaseTables(pool);
    await seedMasterPermissions(pool);
    await seedRolesAndAutoAssignSuperAdmin(pool);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
