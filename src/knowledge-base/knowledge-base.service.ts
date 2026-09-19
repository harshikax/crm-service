import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleListDto } from './dto/article-list.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { paginate } from '../common/utils/prisma-paginator';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { KbVisibility } from '../common/enums/crm.enum';

@Injectable()
export class KnowledgeBaseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createArticleDto: CreateArticleDto, userId?: number) {
    const category = await this.prisma.kb_categories.findUnique({
      where: { id: createArticleDto.category_id },
    });

    if (!category || category.is_archived) {
      throw new UnprocessableEntityException(
        `KB Category with ID "${createArticleDto.category_id}" not found or is archived`,
      );
    }

    const tagIds = await this.resolveTags(
      createArticleDto.tag_ids,
      createArticleDto.tags,
    );

    //  Create Article
    const article = await this.prisma.knowledge_base.create({
      data: {
        category_id: createArticleDto.category_id,
        title: createArticleDto.title,
        description: createArticleDto.description,
        visibility: createArticleDto.visibility ?? KbVisibility.INTERNAL,
        created_by: BigInt(userId ?? 1),
        tags: {
          create: tagIds.map((tagId) => ({
            tag: { connect: { id: tagId } },
          })),
        },
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        tags: {
          select: {
            tag: { select: { id: true, name: true } },
          },
        },
      },
    });

    return this.transformArticle(article);
  }

  async findAll(filterDto: ArticleListDto): Promise<PaginatedResult<any>> {
    const where: any = {
      deleted_at: null,
    };

    if (filterDto.category_id) {
      where.category_id = filterDto.category_id;
    }

    if (filterDto.visibility) {
      where.visibility = filterDto.visibility;
    }

    if (filterDto.tag_id) {
      where.tags = {
        some: {
          tag_id: filterDto.tag_id,
        },
      };
    }

    if (filterDto.search) {
      where.OR = [
        { title: { contains: filterDto.search } },
        { description: { contains: filterDto.search } },
      ];
    }

    const result = await paginate(this.prisma.knowledge_base, filterDto, {
      where,
      include: {
        category: {
          select: { id: true, name: true },
        },
        tags: {
          select: {
            tag: { select: { id: true, name: true } },
          },
        },
        updater: {
          select: { name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      ...result,
      data: (result.data as any[]).map((item) => this.transformArticle(item)),
    };
  }

  async findOne(id: number) {
    const article = await this.prisma.knowledge_base.findFirst({
      where: {
        id,
        deleted_at: null,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        tags: {
          select: {
            tag: { select: { id: true, name: true } },
          },
        },
        updater: {
          select: { name: true },
        },
      },
    });

    if (!article) {
      throw new NotFoundException(
        `Knowledge Base article with ID "${id}" not found`,
      );
    }

    return this.transformArticle(article);
  }

  async update(
    id: number,
    updateArticleDto: UpdateArticleDto,
    userId?: number,
  ) {
    await this.findOne(id);

    if (updateArticleDto.category_id) {
      const category = await this.prisma.kb_categories.findUnique({
        where: { id: updateArticleDto.category_id },
      });
      if (!category || category.is_archived) {
        throw new UnprocessableEntityException(
          `KB Category with ID "${updateArticleDto.category_id}" not found or is archived`,
        );
      }
    }

    const hasTagUpdates =
      updateArticleDto.tag_ids !== undefined ||
      updateArticleDto.tags !== undefined;

    let tagIds: number[] | null = null;
    if (hasTagUpdates) {
      tagIds = await this.resolveTags(
        updateArticleDto.tag_ids,
        updateArticleDto.tags,
      );

      // Remove existing tag relations
      await this.prisma.knowledge_base_tags.deleteMany({
        where: { kb_id: id },
      });
    }

    const updated = await this.prisma.knowledge_base.update({
      where: { id },
      data: {
        ...(updateArticleDto.title && { title: updateArticleDto.title }),
        ...(updateArticleDto.description && {
          description: updateArticleDto.description,
        }),
        ...(updateArticleDto.category_id && {
          category_id: updateArticleDto.category_id,
        }),
        ...(updateArticleDto.visibility && {
          visibility: updateArticleDto.visibility,
        }),
        ...(userId && { updated_by: BigInt(userId) }),
        ...(tagIds && {
          tags: {
            create: tagIds.map((tagId) => ({
              tag: { connect: { id: tagId } },
            })),
          },
        }),
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        tags: {
          select: {
            tag: { select: { id: true, name: true } },
          },
        },
        updater: {
          select: { name: true },
        },
      },
    });

    return this.transformArticle(updated);
  }

  async remove(id: number, userId?: number) {
    await this.findOne(id);

    return this.prisma.knowledge_base.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        ...(userId && { updated_by: BigInt(userId) }),
      },
    });
  }

  // Tags management
  async getTags() {
    return this.prisma.kb_tags.findMany({
      include: {
        _count: {
          select: { articles: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createTag(createTagDto: CreateTagDto) {
    return this.prisma.kb_tags.upsert({
      where: { name: createTagDto.name.trim() },
      update: {},
      create: { name: createTagDto.name.trim() },
    });
  }

  private async resolveTags(
    tagIds?: number[],
    tagNames?: string[],
  ): Promise<number[]> {
    const resultIds = new Set<number>(tagIds || []);

    if (tagNames && tagNames.length > 0) {
      for (const rawName of tagNames) {
        const trimmed = rawName.trim();
        if (!trimmed) continue;

        const tag = await this.prisma.kb_tags.upsert({
          where: { name: trimmed },
          update: {},
          create: { name: trimmed },
        });
        resultIds.add(tag.id);
      }
    }

    return Array.from(resultIds);
  }

  private transformArticle(article: any) {
    const { updater, tags, ...rest } = article;
    return {
      ...rest,
      updated_by: updater?.name ?? null,
      tags: tags ? tags.map((t: any) => t.tag) : [],
    };
  }
}
