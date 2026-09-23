import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PlatformPrismaService } from '../platform-prisma/platform-prisma.service';
import { PrismaService } from '../prisma/prisma.service';
import { TokenRequestDto } from './dto/token-request.dto';
import { verifyPassword } from '../common/utils/password.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly platformPrisma: PlatformPrismaService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}


  async generateToken(dto: TokenRequestDto) {
    const client = await this.platformPrisma.oauth_clients.findUnique({
      where: { client_id: dto.client_id },
      include: { tenant: true },
    });

    if (!client || !client.is_active) {
      throw new UnauthorizedException('Invalid client credentials');
    }

    const isSecretValid = this.verifyClientSecret(
      dto.client_secret,
      client.client_secret,
    );
    if (!isSecretValid) {
      throw new UnauthorizedException('Invalid client credentials');
    }

    const tenant = client.tenant;
    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tenant is inactive or not found');
    }

    let user: any = null;

    if (dto.user_id || dto.user_email) {
      const tenantPrisma = this.prisma.getClient(tenant.db_name);

      user = await tenantPrisma.crm_users.findFirst({
        where: {
          OR: [
            ...(dto.user_id ? [{ external_user_id: String(dto.user_id) }] : []),
            ...(dto.user_email ? [{ email: dto.user_email }] : []),
          ],
        },
      });

      if (!user) {
        const email =
          dto.user_email || `user_${dto.user_id}@${tenant.slug}.local`;
        const name = dto.user_name || `User ${dto.user_id}`;

        user = await tenantPrisma.crm_users.create({
          data: {
            external_user_id: dto.user_id ? String(dto.user_id) : null,
            email,
            name,
            role: 'AGENT',
            is_active: true,
          },
        });
        this.logger.log(
          `Auto-provisioned user '${email}' (role: AGENT) in tenant '${tenant.slug}'`,
        );
      }

      if (!user.is_active) {
        throw new UnauthorizedException('User account is deactivated');
      }
    }

    const permissions = client.scopes || [];

    const payload = {
      sub: user ? user.id : client.client_id,
      tenant_slug: tenant.slug,
      name: user?.name || dto.user_name,
      email: user?.email || dto.user_email,
      role: user ? user.role : 'CLIENT_APP',
      permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '1h',
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenant_slug: tenant.slug,
          }
        : undefined,
    };
  }

  private verifyClientSecret(
    providedKey: string,
    storedSecret: string,
  ): boolean {
    if (!providedKey || !storedSecret) return false;

    const sha256 = crypto
      .createHash('sha256')
      .update(providedKey)
      .digest('hex');
    if (sha256 === storedSecret) return true;

    if (verifyPassword(providedKey, storedSecret)) return true;

    return providedKey === storedSecret;
  }
}
