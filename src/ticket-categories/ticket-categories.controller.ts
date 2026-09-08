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
  UseGuards,
} from '@nestjs/common';
import { TicketCategoriesService } from './ticket-categories.service';
import { CreateTicketCategoryDto } from './dto/create-ticket-category.dto';
import { UpdateTicketCategoryDto } from './dto/update-ticket-category.dto';
import { TicketCategoryListDto } from './dto/ticket-category-list.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('ticket-categories')
export class TicketCategoriesController {
  constructor(private readonly categoriesService: TicketCategoriesService) {}

  @Post()
  create(@Body() createCategoryDto: CreateTicketCategoryDto, @CurrentUser('id') userId: number) {
    return this.categoriesService.create(createCategoryDto, userId);
  }

  @Get()
  findAll(@Query() filterDto: TicketCategoryListDto) {
    return this.categoriesService.findAll(filterDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateTicketCategoryDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.categoriesService.update(id, updateCategoryDto, userId);
  }

  @Patch(':id/archive')
  toggleArchive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.categoriesService.toggleArchive(id, userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}