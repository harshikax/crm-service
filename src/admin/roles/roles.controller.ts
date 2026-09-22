import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
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
@RequirePermissions(PlatformPermission.USERS_MANAGE)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async listAll(@Query() query: PaginationQueryDto) {
    const { data, pagination } = await this.rolesService.findAll(query);
    return makePaginationReturn({
      statusCode: ApiStatus.SUCCESS,
      message: 'Platform roles retrieved successfully',
      data,
      total: pagination.total,
      perPage: pagination.limit,
      currentPage: pagination.page,
    });
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const role = await this.rolesService.findById(id);
    return makeReturn({
      statusCode: ApiStatus.SUCCESS,
      message: 'Platform role retrieved successfully',
      data: role,
    });
  }

  @Post()
  async create(@Body() dto: CreateRoleDto) {
    const role = await this.rolesService.create(dto);
    return makeReturn({
      statusCode: ApiStatus.CREATED,
      message: `Platform role '${role.name}' created successfully`,
      data: role,
    });
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ) {
    const updated = await this.rolesService.update(id, dto);
    return makeReturn({
      statusCode: ApiStatus.SUCCESS,
      message: `Platform role '${updated.name}' updated successfully`,
      data: updated,
    });
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    const result = await this.rolesService.delete(id);
    return makeReturn({
      statusCode: ApiStatus.SUCCESS,
      message: 'Platform role deleted successfully',
      data: result,
    });
  }
}

