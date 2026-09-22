import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { AdminKeyGuard } from '../guards/admin-key.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { PlatformPermission } from '../../common/enums/platform-permissions.enum';
import { Public } from '../../auth/public.decorator';
import { makePaginationReturn } from '../../common/helpers/response.helper';
import { ApiStatus } from '../../common/constants/api-status.constants';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Public()
@UseGuards(AdminKeyGuard, PermissionsGuard)
@RequirePermissions(PlatformPermission.USERS_MANAGE)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async listAll(@Query() query: PaginationQueryDto) {
    const { data, pagination } = await this.permissionsService.findAll(query);
    return makePaginationReturn({
      statusCode: ApiStatus.SUCCESS,
      message: 'Platform permissions retrieved successfully',
      data,
      total: pagination.total,
      perPage: pagination.limit,
      currentPage: pagination.page,
    });
  }

  @Get('categories')
  async getCategories(@Query() query: PaginationQueryDto) {
    const { data, pagination } =
      await this.permissionsService.getCategories(query);
    return makePaginationReturn({
      statusCode: ApiStatus.SUCCESS,
      message: 'Permission categories retrieved successfully',
      data,
      total: pagination.total,
      perPage: pagination.limit,
      currentPage: pagination.page,
    });
  }
}
