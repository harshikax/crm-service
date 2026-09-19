import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKbCategoryDto } from './dto/create-kb-category.dto';
import { UpdateKbCategoryDto } from './dto/update-kb-category.dto';
import { KbCategoryListDto } from './dto/kb-category-list.dto';
import { paginate } from '../common/utils/prisma-paginator';

@Injectable()
export class KbCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createKbCategoryDto: CreateKbCategoryDto, userId?: number) {
    return this.prisma.kb_categories.create({
      data: {
        name: createKbCategoryDto.name,
        description: createKbCategoryDto.description,
        is_archived: createKbCategoryDto.is_archived ?? false,
        updated_by: userId ? Number(userId) : undefined,
      },
    });
  }

  async findAll(filterDto: KbCategoryListDto) {
    const where: any = {};

    if (filterDto.is_archived !== undefined) {
      where.is_archived = filterDto.is_archived;
    }

    if (filterDto.search) {
      where.OR = [
        { name: { contains: filterDto.search } },
        { description: { contains: filterDto.search } },
      ];
    }

    const result = await paginate(this.prisma.kb_categories, filterDto, {
      where,

      include: {
        updater: {
          select: { name: true },
        },
        _count: {
          select: { articles: true },
        },
      },
    });
    return {
      ...result,
      data: (result.data as any[]).map(({ updater, ...category }) => ({
        ...category,
        updated_by: updater?.name ?? null,
      })),
    };
  }

  async findOne(id: number) {
    const category = await this.prisma.kb_categories.findUnique({
      where: { id },
      include: {
        updater: {
          select: { name: true },
        },
        _count: {
          select: { articles: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(
        `Knowledge Base Category with ID ${id} not found`,
      );
    }
    const { updater, ...rest } = category;
    return {
      ...rest,
      updated_by: updater?.name ?? null,
    };
  }

  async update(
    id: number,
    updateCategoryDto: UpdateKbCategoryDto,
    userId?: number,
  ) {
    await this.findOne(id);

    return this.prisma.kb_categories.update({
      where: { id },
      data: {
        ...updateCategoryDto,
        updated_by: userId ? Number(userId) : undefined,
      },
    });
  }

  async toggleArchive(id: number, userId?: number) {
    const category = await this.findOne(id);

    return this.prisma.kb_categories.update({
      where: { id },
      data: {
        is_archived: !category.is_archived,
        updated_by: userId ? Number(userId) : undefined,
      },
    });
  }

  async remove(id: number) {
    const category = await this.findOne(id);

    if (category._count.articles > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.name}" because it contains ${category._count.articles} articles. Please archive it instead.`,
      );
    }

    return this.prisma.kb_categories.delete({
      where: { id },
    });
  }
}
