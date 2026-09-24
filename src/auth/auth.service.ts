import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PlatformPrismaService } from '../platform-prisma/platform-prisma.service';
import { PrismaService } from '../prisma/prisma.service';
import { TokenRequestDto } from './dto/token-request.dto';
import { AuthorizeRequestDto } from './dto/authorize-request.dto';
import { ConsentDecisionDto } from './dto/consent-decision.dto';
import { verifyPassword } from '../common/utils/password.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly platformPrisma: PlatformPrismaService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async authorize(dto: AuthorizeRequestDto) {
    const client = await this.platformPrisma.oauth_clients.findUnique({
      where: { client_id: dto.client_id },
      include: { tenant: true },
    });

    if (!client || !client.is_active || client.tenant?.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid or inactive OAuth client');
    }

    const existingConsent = await this.platformPrisma.oauth_consents.findUnique(
      {
        where: {
          client_id_external_user_id: {
            client_id: dto.client_id,
            external_user_id: String(dto.user_id),
          },
        },
      },
    );

    // If user has already granted consent -> Auto-approve (Silent Redirect)
    if (existingConsent) {
      const code = this.generateAuthorizationCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const scopes =
        existingConsent.scopes?.length > 0
          ? existingConsent.scopes
          : client.scopes || [];

      await this.platformPrisma.oauth_authorization_codes.create({
        data: {
          code,
          client_id: client.client_id,
          tenant_id: client.tenant_id,
          external_user_id: String(dto.user_id),
          user_email: dto.user_email || existingConsent.user_email,
          user_name: dto.user_name,
          redirect_uri: dto.redirect_uri,
          scopes,
          expires_at: expiresAt,
        },
      });

      const redirectUrl = this.buildRedirectUrl(dto.redirect_uri, { code });

      return {
        auto_approved: true,
        redirect_url: redirectUrl,
      };
    }

    const defaultBaseUrl = process.env.APP_URL || 'http://api.crm.local.dev';
    const cleanBaseUrl = defaultBaseUrl.replace(/\/+$/, '');
    const consentUrl = `${cleanBaseUrl}/api/auth/consent`;

    return {
      auto_approved: false,
      client_id: client.client_id,
      client_name: client.name,
      tenant_name: client.tenant.name,
      tenant_slug: client.tenant.slug,
      scopes: client.scopes || [],
      redirect_uri: dto.redirect_uri,
      user_id: dto.user_id,
      user_email: dto.user_email,
      user_name: dto.user_name,
      consent_url: consentUrl,
    };
  }

  // Saves persistent consent if ALLOW, generates auth code, and returns redirect_url.
  async processConsent(dto: ConsentDecisionDto) {
    const client = await this.platformPrisma.oauth_clients.findUnique({
      where: { client_id: dto.client_id },
      include: { tenant: true },
    });

    if (!client || !client.is_active || client.tenant?.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid or inactive OAuth client');
    }

    if (dto.action === 'DENY') {
      const redirectUrl = this.buildRedirectUrl(dto.redirect_uri, {
        error: 'access_denied',
        error_description: 'User denied CRM access request',
      });
      return {
        action: 'DENIED',
        redirect_url: redirectUrl,
      };
    }

    const grantedScopes = client.scopes || [];
    await this.platformPrisma.oauth_consents.upsert({
      where: {
        client_id_external_user_id: {
          client_id: client.client_id,
          external_user_id: String(dto.user_id),
        },
      },
      create: {
        client_id: client.client_id,
        tenant_id: client.tenant_id,
        external_user_id: String(dto.user_id),
        user_email: dto.user_email,
        scopes: grantedScopes,
      },
      update: {
        user_email: dto.user_email,
        scopes: grantedScopes,
        updated_at: new Date(),
      },
    });

    const code = this.generateAuthorizationCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.platformPrisma.oauth_authorization_codes.create({
      data: {
        code,
        client_id: client.client_id,
        tenant_id: client.tenant_id,
        external_user_id: String(dto.user_id),
        user_email: dto.user_email,
        user_name: dto.user_name,
        redirect_uri: dto.redirect_uri,
        scopes: grantedScopes,
        expires_at: expiresAt,
      },
    });

    const redirectUrl = this.buildRedirectUrl(dto.redirect_uri, { code });

    return {
      action: 'ALLOWED',
      redirect_url: redirectUrl,
    };
  }

  // Supports 'authorization_code' flow and 'client_credentials' flow.
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

    let externalUserId = dto.user_id;
    let userEmail = dto.user_email;
    let userName = dto.user_name;
    let permissions = client.scopes || [];

    if (dto.code) {
      const authCode =
        await this.platformPrisma.oauth_authorization_codes.findUnique({
          where: { code: dto.code },
        });

      if (
        !authCode ||
        authCode.is_used ||
        authCode.client_id !== dto.client_id ||
        new Date() > authCode.expires_at
      ) {
        throw new UnauthorizedException(
          'Invalid, expired, or previously used authorization code',
        );
      }

      await this.platformPrisma.oauth_authorization_codes.update({
        where: { id: authCode.id },
        data: { is_used: true },
      });

      externalUserId = authCode.external_user_id || undefined;
      userEmail = authCode.user_email || undefined;
      userName = authCode.user_name || undefined;
      permissions = authCode.scopes || client.scopes || [];
    }

    let user: any = null;

    if (externalUserId || userEmail) {
      const tenantPrisma = this.prisma.getClient(tenant.db_name);

      user = await tenantPrisma.crm_users.findFirst({
        where: {
          OR: [
            ...(externalUserId
              ? [{ external_user_id: String(externalUserId) }]
              : []),
            ...(userEmail ? [{ email: userEmail }] : []),
          ],
        },
      });

      if (!user) {
        const email =
          userEmail || `user_${externalUserId}@${tenant.slug}.local`;
        const name = userName || `User ${externalUserId}`;

        user = await tenantPrisma.crm_users.create({
          data: {
            external_user_id: externalUserId ? String(externalUserId) : null,
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

    const payload = {
      sub: user ? user.id : client.client_id,
      tenant_slug: tenant.slug,
      name: user?.name || userName,
      email: user?.email || userEmail,
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
      scope: permissions.join(' '),
      permissions,
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

  private generateAuthorizationCode(): string {
    return `auth_${crypto.randomBytes(24).toString('hex')}`;
  }

  private buildRedirectUrl(
    baseUrl: string,
    params: Record<string, string | undefined>,
  ): string {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
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
