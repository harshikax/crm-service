import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseBoolPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ApiStatus } from '../common/constants/api-status.constants';
import {
  makeReturn,
  makePaginationReturn,
} from '../common/helpers/response.helper';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  async create(@Body() createDepartmentDto: CreateDepartmentDto) {
    const department =
      await this.departmentsService.create(createDepartmentDto);
    return makeReturn({
      statusCode: ApiStatus.CREATED,
      message: 'Department created successfully',
      data: department,
    });
  }

  @Get()
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('is_active', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
  ) {
    const { data, pagination } = await this.departmentsService.findAll(
      query,
      isActive,
    );

    return makePaginationReturn({
      data,
      total: pagination.total,
      perPage: pagination.limit,
      currentPage: pagination.page,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const department = await this.departmentsService.findOne(id);
    return makeReturn({ data: department });
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    const department = await this.departmentsService.update(
      id,
      updateDepartmentDto,
    );
    return makeReturn({
      message: 'Department updated successfully',
      data: department,
    });
  }

  @Patch(':id/toggle-status')
  async toggleStatus(@Param('id', ParseIntPipe) id: number) {
    const department = await this.departmentsService.toggleStatus(id);
    return makeReturn({
      message: 'Department status toggled successfully',
      data: department,
    });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.departmentsService.remove(id);
    return makeReturn({
      message: 'Department deleted successfully',
    });
  }
}
