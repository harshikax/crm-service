import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PlatformPrismaService } from '../../platform-prisma/platform-prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantDatabaseService } from './tenant-database.service';
import { ApplicationsService } from '../applications/applications.service';
import { TenantStatus } from '../../common/enums/platform.enum';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/utils/prisma-paginator';
import { Prisma } from '../../generated/platform-prisma/client';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly platformPrisma: PlatformPrismaService,
    private readonly databaseService: TenantDatabaseService,
    private readonly applicationsService: ApplicationsService,
  ) {}

  async findAllTenants(query: PaginationQueryDto) {
    const where: Prisma.tenantsWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return paginate(this.platformPrisma.tenants, query, {
      where,
      orderBy: { id: 'desc' },
    });
  }

  async findTenantById(id: number) {
    const tenant = await this.platformPrisma.tenants.findUnique({
      where: { id },
      include: {
        applications: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return tenant;
  }

  async provisionTenant(dto: CreateTenantDto) {
    const normalizedSlug = dto.slug.toLowerCase().trim();

    await this.validateProvisioningRequest(normalizedSlug);

    const dbName = `crm_${normalizedSlug}_db`;
    const tenant = await this.platformPrisma.tenants.create({
      data: {
        name: dto.name,
        slug: normalizedSlug,
        db_name: dbName,
        status: TenantStatus.PROVISIONING,
      },
    });

    let dbCreated = false;
    try {
      await this.databaseService.createDatabase(dbName);
      dbCreated = true;
      await this.databaseService.setupTenantDatabase(dbName);

      const oauthBundle =
        await this.applicationsService.registerInitialApplications(
          { id: tenant.id, slug: normalizedSlug },
          dto.applications,
        );

      await this.platformPrisma.tenants.update({
        where: { id: tenant.id },
        data: { status: TenantStatus.ACTIVE, error_message: null },
      });

      const fullTenant = await this.findTenantById(tenant.id);

      return {
        ...fullTenant,
        client_id: oauthBundle.client_id,
        plain_client_secret: oauthBundle.plain_client_secret,
      };
    } catch (err: any) {
      this.logger.error(`Provisioning failed for '${normalizedSlug}':`, err);
      await this.handleProvisioningFailure(tenant.id, dbName, dbCreated, err);
      throw new InternalServerErrorException(
        `Failed to provision tenant '${normalizedSlug}': ${err.message}`,
      );
    }
  }

  // Updates the lifecycle status of a tenant (ACTIVE, SUSPENDED, ARCHIVED).
  async updateTenantStatus(id: number, status: TenantStatus) {
    await this.findTenantById(id);

    const updated = await this.platformPrisma.tenants.update({
      where: { id },
      data: { status },
    });

    return updated;
  }

  private async validateProvisioningRequest(slug: string): Promise<void> {
    const existing = await this.platformPrisma.tenants.findUnique({
      where: { slug },
    });
    if (existing) {
      if (existing.status === TenantStatus.FAILED) {
        const dbName = existing.db_name || `crm_${slug}_db`;
        await this.databaseService.dropDatabase(dbName);
        await this.platformPrisma.tenants.delete({
          where: { id: existing.id },
        });
        return;
      }
      throw new ConflictException(`Tenant slug '${slug}' is already in use`);
    }
  }

  private async handleProvisioningFailure(
    tenantId: number,
    dbName: string,
    dbCreated: boolean,
    _err: any,
  ): Promise<void> {
    if (dbCreated) {
      await this.databaseService.dropDatabase(dbName);
    }

    try {
      await this.platformPrisma.tenants.delete({
        where: { id: tenantId },
      });
    } catch (cleanupErr: any) {
      this.logger.error(
        `Failed to delete tenant record ${tenantId}:`,
        cleanupErr,
      );
    }
  }
}
