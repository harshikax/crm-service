import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PlatformPrismaService } from '../../platform-prisma/platform-prisma.service';
import { RequestContext } from '../../common/context/request-context';

@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly platformPrisma: PlatformPrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid authorization token (Bearer token required)',
      );
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      if (!payload || !payload.sub || !payload.email) {
        throw new UnauthorizedException('Invalid platform token payload');
      }

      const user = await this.platformPrisma.platform_users.findUnique({
        where: { id: Number(payload.sub) },
        include: {
          role: {
            include: {
              role_permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!user || !user.is_active) {
        throw new UnauthorizedException('Platform user not found or inactive');
      }

      const roleName = user.role?.name || 'ADMIN';
      const isSuperAdmin = Boolean(user.role?.is_system);
      const effectivePermissions = isSuperAdmin
        ? ['*']
        : user.role?.role_permissions?.map((rp) => rp.permission.code) || [];

      request.adminActor = user.email;
      request.adminUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: roleName,
        is_system: isSuperAdmin,
        permissions: effectivePermissions,
      };

      RequestContext.setActor(user.email);
      return true;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException(
        `Invalid or expired platform token: ${err.message}`,
      );
    }
  }
}
