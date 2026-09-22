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
import { AdminUsersService } from './admin-users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
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
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  async listAll(@Query() query: PaginationQueryDto) {
    const { data, pagination } = await this.usersService.findAll(query);
    return makePaginationReturn({
      statusCode: ApiStatus.SUCCESS,
      message: 'Platform users retrieved successfully',
      data,
      total: pagination.total,
      perPage: pagination.limit,
      currentPage: pagination.page,
    });
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findById(id);
    return makeReturn({
      statusCode: ApiStatus.SUCCESS,
      message: 'Platform user retrieved successfully',
      data: user,
    });
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return makeReturn({
      statusCode: ApiStatus.CREATED,
      message: `Platform user '${user.name}' created successfully`,
      data: user,
    });
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    const updated = await this.usersService.update(id, dto);
    return makeReturn({
      statusCode: ApiStatus.SUCCESS,
      message: 'Platform user updated successfully',
      data: updated,
    });
  }
}
