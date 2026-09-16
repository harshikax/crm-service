import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    try {
      const decoded = this.jwtService.decode(token) as any;

      if (!decoded || typeof decoded !== 'object') {
        throw new UnauthorizedException('Invalid token structure');
      }

      if (!decoded.token || typeof decoded.token !== 'string') {
        throw new UnauthorizedException('Inner session token is missing');
      }

      const innerPayload = this.jwtService.decode(decoded.token) as any;
      if (!innerPayload || typeof innerPayload !== 'object') {
        throw new UnauthorizedException('Invalid inner session token');
      }

      const currentTime = Math.floor(Date.now() / 1000);

      if (innerPayload.exp && Number(innerPayload.exp) < currentTime) {
        throw new UnauthorizedException('Token has expired');
      }

      const userData = decoded.user || {};
      request.user = {
        id: userData.id
          ? Number(userData.id)
          : innerPayload.sub
            ? Number(innerPayload.sub)
            : undefined,
        name: userData.name,
        email: userData.email,
        roles: decoded.role || [],
        permissions: Array.isArray(decoded.permissions)
          ? decoded.permissions.map((p: any) => p.authority || p.name || p)
          : [],
        guard: decoded.guard,
        rawUser: userData,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token or session expired');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    if (request.headers['token']) {
      return request.headers['token'] as string;
    }

    return null;
  }
}
