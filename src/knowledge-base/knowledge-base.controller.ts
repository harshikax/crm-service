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
import { KnowledgeBaseService } from './knowledge-base.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleListDto } from './dto/article-list.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  makeReturn,
  makePaginationReturn,
} from '../common/helpers/response.helper';
import { ApiStatus } from '../common/constants/api-status.constants';

@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Post()
  async create(
    @Body() createArticleDto: CreateArticleDto,
    @CurrentUser('id') userId?: number,
  ) {
    const article = await this.knowledgeBaseService.create(
      createArticleDto,
      userId,
    );
    return makeReturn({
      statusCode: ApiStatus.CREATED,
      message: 'Knowledge Base article created successfully',
      data: article,
    });
  }

  @Get()
  async findAll(@Query() query: ArticleListDto) {
    const { data, pagination } = await this.knowledgeBaseService.findAll(query);

    return makePaginationReturn({
      data,
      total: pagination.total,
      perPage: pagination.limit,
      currentPage: pagination.page,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const article = await this.knowledgeBaseService.findOne(id);
    return makeReturn({
      data: article,
    });
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateArticleDto: UpdateArticleDto,
    @CurrentUser('id') userId?: number,
  ) {
    const article = await this.knowledgeBaseService.update(
      id,
      updateArticleDto,
      userId,
    );
    return makeReturn({
      message: 'Knowledge Base article updated successfully',
      data: article,
    });
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId?: number,
  ) {
    await this.knowledgeBaseService.remove(id, userId);
    return makeReturn({
      message: 'Knowledge Base article deleted successfully',
    });
  }

  @Get('tags')
  async getTags() {
    const tags = await this.knowledgeBaseService.getTags();
    return makeReturn({
      message: 'Tags fetched successfully',
      data: tags,
    });
  }

  @Post('tags')
  async createTag(@Body() createTagDto: CreateTagDto) {
    const tag = await this.knowledgeBaseService.createTag(createTagDto);
    return makeReturn({
      statusCode: ApiStatus.CREATED,
      message: 'Tag created successfully',
      data: tag,
    });
  }
}
