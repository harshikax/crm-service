import 'dotenv/config';
import { Pool } from 'pg';
import { hashPassword } from '../src/common/utils/password.util';
import {
  syncDatabaseTables,
  seedMasterPermissions,
  seedRolesAndAutoAssignSuperAdmin,
} from './seed-permissions';

const DEFAULT_SUPER_ADMIN = {
  name: 'Platform Super Admin',
  email: 'admin@crm.lk',
  password: 'Admin@12345',
};

async function seedInitialSuperAdmin(pool: Pool) {
  const normalizedEmail = DEFAULT_SUPER_ADMIN.email.toLowerCase().trim();

  const superAdminRole = await pool.query(
    'SELECT id FROM platform_roles WHERE name = $1',
    ['SUPER_ADMIN'],
  );
  const superAdminRoleId = superAdminRole.rows[0].id;

  const existingUser = await pool.query(
    'SELECT id FROM platform_users WHERE email = $1',
    [normalizedEmail],
  );

  if (existingUser.rows.length === 0) {
    const hashedPassword = hashPassword(DEFAULT_SUPER_ADMIN.password);
    await pool.query(
      `INSERT INTO platform_users (name, email, password, role_id, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [DEFAULT_SUPER_ADMIN.name, normalizedEmail, hashedPassword, superAdminRoleId, true],
    );
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is missing.');
  }

  const pool = new Pool({ connectionString });

  try {
    await syncDatabaseTables(pool);
    await seedMasterPermissions(pool);
    await seedRolesAndAutoAssignSuperAdmin(pool);
    await seedInitialSuperAdmin(pool);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
