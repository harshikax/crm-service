import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PlatformPrismaService } from '../../platform-prisma/platform-prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationStatus } from '../../common/enums/platform.enum';
import { hashPassword } from '../../common/utils/password.util';

const DEFAULT_SCOPES = [
  'crm:read',
  'crm:write',
  'departments:read',
  'departments:write',
  'categories:read',
  'categories:write',
  'tickets:read',
  'tickets:write',
  'dropdowns:read',
  'dropdowns:write',
  'kb:read',
  'kb:write',
];

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(private readonly platformPrisma: PlatformPrismaService) {}

  async registerInitialApplications(
    tenant: { id: number; slug: string },
    applications: CreateApplicationDto[],
  ) {
    const bundle = this.generateOAuthBundle(
      tenant.slug,
      `${tenant.slug} Tenant`,
    );

    return await this.platformPrisma.$transaction(async (tx) => {
      for (const appDto of applications) {
        await tx.applications.create({
          data: {
            tenant_id: tenant.id,
            name: appDto.name,
            base_url: appDto.base_url || '',
            status: ApplicationStatus.ACTIVE,
          },
        });
      }

      // Generate ONE single OAuth Client for the entire Tenant
      const oauthClient = await tx.oauth_clients.create({
        data: {
          tenant_id: tenant.id,
          name: `${tenant.slug} Tenant Client`,
          client_id: bundle.clientId,
          client_secret: bundle.hashedSecret,
          scopes: DEFAULT_SCOPES,
        },
      });

      return {
        client_id: oauthClient.client_id,
        plain_client_secret: bundle.rawSecret,
      };
    });
  }

  // Creates a new application under an existing tenant.
  async createApplication(tenantId: number, dto: CreateApplicationDto) {
    const tenant = await this.platformPrisma.tenants.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const app = await this.platformPrisma.applications.create({
      data: {
        tenant_id: tenantId,
        name: dto.name,
        base_url: dto.base_url || '',
        status: ApplicationStatus.ACTIVE,
      },
    });

    return app;
  }

  // Updates an existing application configuration.
  async updateApplication(applicationId: number, dto: UpdateApplicationDto) {
    const app = await this.platformPrisma.applications.findUnique({
      where: { id: applicationId },
    });
    if (!app) {
      throw new NotFoundException(
        `Application with ID ${applicationId} not found`,
      );
    }

    const updatedApp = await this.platformPrisma.applications.update({
      where: { id: applicationId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.base_url !== undefined ? { base_url: dto.base_url } : {}),
      },
    });

    return updatedApp;
  }

  // Revokes an application.
  async revokeApplication(applicationId: number) {
    const app = await this.platformPrisma.applications.findUnique({
      where: { id: applicationId },
    });
    if (!app) {
      throw new NotFoundException(
        `Application with ID ${applicationId} not found`,
      );
    }

    const updated = await this.platformPrisma.applications.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.REVOKED },
    });

    return updated;
  }

  // Rotates OAuth 2.0 PKCE credentials for a tenant.
  async rotateOAuthCredentials(tenantId: number) {
    const tenant = await this.platformPrisma.tenants.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const bundle = this.generateOAuthBundle(
      tenant.slug,
      `${tenant.slug} Tenant`,
    );

    const existingOAuth = await this.platformPrisma.oauth_clients.findFirst({
      where: { tenant_id: tenantId },
    });

    let updatedOAuth;
    if (existingOAuth) {
      updatedOAuth = await this.platformPrisma.oauth_clients.update({
        where: { id: existingOAuth.id },
        data: {
          client_secret: bundle.hashedSecret,
          updated_at: new Date(),
        },
      });
    } else {
      updatedOAuth = await this.platformPrisma.oauth_clients.create({
        data: {
          tenant_id: tenantId,
          name: `${tenant.slug} Tenant Client`,
          client_id: bundle.clientId,
          client_secret: bundle.hashedSecret,
          scopes: DEFAULT_SCOPES,
        },
      });
    }

    return {
      id: updatedOAuth.id,
      tenant_id: updatedOAuth.tenant_id,
      client_id: updatedOAuth.client_id,
      scopes: updatedOAuth.scopes,
      plain_client_secret: bundle.rawSecret,
    };
  }

  // Helper to generate a single secure OAuth client credential bundle.
  private generateOAuthBundle(
    tenantSlug: string,
    appName: string,
  ): { clientId: string; rawSecret: string; hashedSecret: string } {
    const sanitizedAppName = appName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const clientId = `${tenantSlug}-${sanitizedAppName}-${crypto.randomBytes(4).toString('hex')}`;
    const rawSecret = `sec_${crypto.randomBytes(32).toString('hex')}`;
    const hashedSecret = hashPassword(rawSecret);

    return { clientId, rawSecret, hashedSecret };
  }
}
