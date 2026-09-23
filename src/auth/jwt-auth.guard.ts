import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PlatformPrismaService } from '../platform-prisma/platform-prisma.service';
import { RequestContext } from '../common/context/request-context';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly platformPrisma: PlatformPrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is required');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      if (!payload || typeof payload !== 'object') {
        throw new UnauthorizedException('Invalid token');
      }

      if (payload.tenant_slug) {
        const tenant = await this.platformPrisma.tenants.findUnique({
          where: { slug: payload.tenant_slug },
        });

        if (!tenant || tenant.status !== 'ACTIVE') {
          throw new UnauthorizedException('Tenant is inactive or not found');
        }

        RequestContext.setTenant(tenant.slug, tenant.db_name);

        request.user = {
          id: payload.sub,
          name: payload.name,
          email: payload.email,
          role: payload.role,
          tenant_slug: tenant.slug,
          permissions: payload.permissions || [],
        };
        return true;
      }

      if (typeof payload.sub === 'number') {
        RequestContext.setUserId(payload.sub);
      }
      request.user = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions || [],
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
