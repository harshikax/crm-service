import { Module } from '@nestjs/common';
import { PlatformPrismaModule } from '../platform-prisma/platform-prisma.module';
import { AdminKeyGuard } from './guards/admin-key.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { AdminAuthController } from './auth/admin-auth.controller';
import { AdminAuthService } from './auth/admin-auth.service';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';
import { RolesController } from './roles/roles.controller';
import { RolesService } from './roles/roles.service';
import { PermissionsController } from './permissions/permissions.controller';
import { PermissionsService } from './permissions/permissions.service';
import { TenantsController } from './tenants/tenants.controller';
import { TenantsService } from './tenants/tenants.service';
import { TenantDatabaseService } from './tenants/tenant-database.service';
import { ApplicationsController } from './applications/applications.controller';
import { ApplicationsService } from './applications/applications.service';

@Module({
  imports: [PlatformPrismaModule],
  controllers: [
    AdminAuthController,
    AdminUsersController,
    RolesController,
    PermissionsController,
    TenantsController,
    ApplicationsController,
  ],
  providers: [
    AdminAuthService,
    AdminUsersService,
    RolesService,
    PermissionsService,
    TenantsService,
    TenantDatabaseService,
    ApplicationsService,
    AdminKeyGuard,
    PermissionsGuard,
  ],
  exports: [
    AdminAuthService,
    AdminUsersService,
    RolesService,
    PermissionsService,
    TenantsService,
    TenantDatabaseService,
    ApplicationsService,
    AdminKeyGuard,
    PermissionsGuard,
  ],
})
export class AdminModule {}
