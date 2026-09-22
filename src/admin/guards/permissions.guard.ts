import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { PlatformPermission } from '../../common/enums/platform-permissions.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    if (request.isAdminKey) {
      return true;
    }

    const user = request.adminUser;
    if (!user) {
      throw new ForbiddenException('User context is missing');
    }

    const isSuperAdmin =
      user.role?.toUpperCase() === 'SUPER_ADMIN' ||
      user.role?.toLowerCase() === 'super admin' ||
      user.permissions?.includes('*');

    if (isSuperAdmin) {
      return true;
    }

    const userPermissions: string[] = Array.isArray(user.permissions)
      ? user.permissions
      : [];

    const hasPermission = requiredPermissions.some((required) => {
      if (userPermissions.includes(required)) return true;
      if (
        required === PlatformPermission.TENANTS_READ &&
        userPermissions.includes(PlatformPermission.TENANTS_MANAGE)
      ) {
        return true;
      }
      return false;
    });

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required one of: [${requiredPermissions.join(', ')}]`,
      );
    }

    return true;
  }
}


