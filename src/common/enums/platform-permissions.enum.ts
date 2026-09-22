export const PLATFORM_PERMISSIONS = {
  TENANTS_MANAGE: {
    code: 'tenants.manage',
    name: 'Manage Tenants',
    category: 'Tenant Management',
    description: 'Create, update, provision, and suspend tenant environments.',
  },
  TENANTS_READ: {
    code: 'tenants.read',
    name: 'View Tenants',
    category: 'Tenant Management',
    description: 'View tenant lists, details, and connection status.',
  },
  APPLICATIONS_MANAGE: {
    code: 'applications.manage',
    name: 'Manage Applications',
    category: 'Platform Configuration',
    description:
      'Configure platform applications, OAuth clients, and CRM integrations.',
  },
  USERS_MANAGE: {
    code: 'users.manage',
    name: 'Manage Users & Roles',
    category: 'User Management',
    description:
      'Create, update, delete platform operators and customize role permissions.',
  },
  AUDIT_READ: {
    code: 'audit.read',
    name: 'View Audit Logs',
    category: 'Audit & Compliance',
    description:
      'Inspect platform operation history, security events, and audit trails.',
  },
} as const;

export type PlatformPermissionKey = keyof typeof PLATFORM_PERMISSIONS;

export const PlatformPermission = (
  Object.keys(PLATFORM_PERMISSIONS) as PlatformPermissionKey[]
).reduce(
  (acc, key) => {
    acc[key] = PLATFORM_PERMISSIONS[key].code;
    return acc;
  },
  {} as Record<string, string>,
) as {
  [K in PlatformPermissionKey]: (typeof PLATFORM_PERMISSIONS)[K]['code'];
};

export type PlatformPermission =
  (typeof PLATFORM_PERMISSIONS)[PlatformPermissionKey]['code'];


