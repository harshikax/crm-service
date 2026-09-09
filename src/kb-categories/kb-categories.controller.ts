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

@Controller('kb-categories')
export class KbCategoriesController {
  constructor(private readonly kbCategoriesService: KbCategoriesService) {}

  @Post()
  create(
    @Body() createCategoryDto: CreateKbCategoryDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.kbCategoriesService.create(createCategoryDto, userId);
  }

  @Get()
  findAll(@Query() filterDto: KbCategoryListDto) {
    return this.kbCategoriesService.findAll(filterDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.kbCategoriesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateKbCategoryDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.kbCategoriesService.update(id, updateCategoryDto, userId);
  }

  @Patch(':id/archive')
  toggleArchive(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.kbCategoriesService.toggleArchive(id, userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.kbCategoriesService.remove(id);
  }
}
