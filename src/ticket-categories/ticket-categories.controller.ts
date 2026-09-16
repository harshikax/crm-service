import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { TicketCategoriesService } from './ticket-categories.service';
import { CreateTicketCategoryDto } from './dto/create-ticket-category.dto';
import { UpdateTicketCategoryDto } from './dto/update-ticket-category.dto';
import { TicketCategoryListDto } from './dto/ticket-category-list.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiStatus } from '../common/constants/api-status.constants';
import {
  makeReturn,
  makePaginationReturn,
} from '../common/helpers/response.helper';

@Controller('ticket-categories')
export class TicketCategoriesController {
  constructor(private readonly categoriesService: TicketCategoriesService) {}

  @Post()
  async create(
    @Body() createCategoryDto: CreateTicketCategoryDto,
    @CurrentUser('id') userId: number,
  ) {
    const category = await this.categoriesService.create(
      createCategoryDto,
      userId,
    );
    return makeReturn({
      statusCode: ApiStatus.CREATED,
      message: 'Ticket Category created successfully',
      data: category,
    });
  }

  @Get()
  async findAll(@Query() filterDto: TicketCategoryListDto) {
    const { data, pagination } =
      await this.categoriesService.findAll(filterDto);
    return makePaginationReturn({
      data,
      total: pagination.total,
      perPage: pagination.limit,
      currentPage: pagination.page,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const category = await this.categoriesService.findOne(id);
    return makeReturn({ data: category });
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateTicketCategoryDto,
    @CurrentUser('id') userId: number,
  ) {
    const category = await this.categoriesService.update(
      id,
      updateCategoryDto,
      userId,
    );
    return makeReturn({
      message: 'Ticket Category updated successfully',
      data: category,
    });
  }

  @Patch(':id/archive')
  async toggleArchive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    const category = await this.categoriesService.toggleArchive(id, userId);
    return makeReturn({
      message: 'Ticket Category  status toggled successfully',
      data: category,
    });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.categoriesService.remove(id);
    return makeReturn({
      message: 'Ticket Category deleted successfully',
    });
  }
}
