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
      const secret = process.env.JWT_SECRET;
      const payload = await this.jwtService.verifyAsync(token, { secret });

      if (payload.token) {
        const innerPayload = this.jwtService.decode(payload.token) as any;
        if (innerPayload?.exp) {
          const currentTime = Math.floor(Date.now() / 1000);
          if (innerPayload.exp < currentTime) {
            throw new UnauthorizedException('Token has expired');
          }
        }
      }

      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedException('Token has expired');
      }

      request.user = {
        id: payload.user?.id ? Number(payload.user.id) : undefined,
        name: payload.user?.name,
        email: payload.user?.email,
        roles: payload.role || [],
        permissions: (payload.permissions || []).map((p: any) => p.authority),
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token or verification failed');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    if (request.headers['secret']) {
      return request.headers['secret'];
    }
    if (request.headers['token']) {
      return request.headers['token'];
    }
    return null;
  }
}