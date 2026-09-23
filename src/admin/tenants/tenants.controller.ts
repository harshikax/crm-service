import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { ApplicationsService } from '../applications/applications.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import { AdminKeyGuard } from '../guards/admin-key.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { PlatformPermission } from '../../common/enums/platform-permissions.enum';
import { Public } from '../../auth/public.decorator';
import {
  makeReturn,
  makePaginationReturn,
} from '../../common/helpers/response.helper';
import { ApiStatus } from '../../common/constants/api-status.constants';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Public()
@UseGuards(AdminKeyGuard, PermissionsGuard)
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly applicationsService: ApplicationsService,
  ) {}

  @Get()
  @RequirePermissions(
    PlatformPermission.TENANTS_READ,
    PlatformPermission.TENANTS_MANAGE,
  )
  async listAll(@Query() query: PaginationQueryDto) {
    const { data, pagination } =
      await this.tenantsService.findAllTenants(query);
    return makePaginationReturn({
      statusCode: ApiStatus.SUCCESS,
      message: 'Tenants retrieved successfully',
      data,
      total: pagination.total,
      perPage: pagination.limit,
      currentPage: pagination.page,
    });
  }

  @Get(':id')
  @RequirePermissions(
    PlatformPermission.TENANTS_READ,
    PlatformPermission.TENANTS_MANAGE,
  )
  async getById(@Param('id', ParseIntPipe) id: number) {
    const tenant = await this.tenantsService.findTenantById(id);
    return makeReturn({
      statusCode: ApiStatus.SUCCESS,
      message: 'Tenant details retrieved successfully',
      data: tenant,
    });
  }

  @Post()
  @RequirePermissions(PlatformPermission.TENANTS_MANAGE)
  async provision(@Body() dto: CreateTenantDto) {
    const tenant = await this.tenantsService.provisionTenant(dto);
    return makeReturn({
      statusCode: ApiStatus.CREATED,
      message: `Tenant '${dto.name}' provisioned successfully with database '${tenant.db_name}'`,
      data: tenant,
    });
  }

  @Patch(':id/status')
  @RequirePermissions(PlatformPermission.TENANTS_MANAGE)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTenantStatusDto,
  ) {
    const updated = await this.tenantsService.updateTenantStatus(
      id,
      dto.status,
    );

    return makeReturn({
      statusCode: ApiStatus.SUCCESS,
      message: `Tenant status updated to ${dto.status}`,
      data: updated,
    });
  }

  @Post(':id/oauth-client/rotate')
  @RequirePermissions(PlatformPermission.TENANTS_MANAGE)
  async rotateOAuth(@Param('id', ParseIntPipe) id: number) {
    const oauth = await this.applicationsService.rotateOAuthCredentials(id);
    return makeReturn({
      statusCode: ApiStatus.SUCCESS,
      message: 'OAuth credentials rotated successfully',
      data: oauth,
    });
  }
}
