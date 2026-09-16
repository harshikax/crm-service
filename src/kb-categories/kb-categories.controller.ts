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
import { KbCategoriesService } from './kb-categories.service';
import { CreateKbCategoryDto } from './dto/create-kb-category.dto';
import { UpdateKbCategoryDto } from './dto/update-kb-category.dto';
import { KbCategoryListDto } from './dto/kb-category-list.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiStatus } from '../common/constants/api-status.constants';
import {
  makeReturn,
  makePaginationReturn,
} from '../common/helpers/response.helper';

@Controller('kb-categories')
export class KbCategoriesController {
  constructor(private readonly kbCategoriesService: KbCategoriesService) {}

  @Post()
  async create(
    @Body() createCategoryDto: CreateKbCategoryDto,
    @CurrentUser('id') userId: number,
  ) {
    const category = await this.kbCategoriesService.create(
      createCategoryDto,
      userId,
    );
    return makeReturn({
      statusCode: ApiStatus.CREATED,
      message: 'Knowledge Base Category created successfully',
      data: category,
    });
  }

  @Get()
  async findAll(@Query() filterDto: KbCategoryListDto) {
    const { data, pagination } =
      await this.kbCategoriesService.findAll(filterDto);
    return makePaginationReturn({
      data,
      total: pagination.total,
      perPage: pagination.limit,
      currentPage: pagination.page,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const category = await this.kbCategoriesService.findOne(id);
    return makeReturn({ data: category });
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateKbCategoryDto,
    @CurrentUser('id') userId: number,
  ) {
    const category = await this.kbCategoriesService.update(
      id,
      updateCategoryDto,
      userId,
    );
    return makeReturn({
      message: 'Knowledge Base Category updated successfully',
      data: category,
    });
  }

  @Patch(':id/archive')
  async toggleArchive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    const category = await this.kbCategoriesService.toggleArchive(id, userId);
    return makeReturn({
      message: 'Knowledge Base Category status toggled successfully',
      data: category,
    });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.kbCategoriesService.remove(id);
    return makeReturn({
      message: 'Knowledge Base Category deleted successfully',
    });
  }
}
