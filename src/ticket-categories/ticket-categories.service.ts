import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketCategoryDto } from './dto/create-ticket-category.dto';
import { UpdateTicketCategoryDto } from './dto/update-ticket-category.dto';
import { TicketCategoryListDto } from './dto/ticket-category-list.dto';
import { paginate } from '../common/utils/prisma-paginator';

@Injectable()
export class TicketCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateTicketCategoryDto, userId?: number) {
    return this.prisma.ticket_categories.create({
      data: {
        name: createCategoryDto.name,
        description: createCategoryDto.description,
        is_archived: createCategoryDto.is_archived ?? false,
        updated_by: userId ? Number(userId) : undefined,
      },
    });
  }

  async findAll(filterDto: TicketCategoryListDto) {
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

    const result = await paginate(this.prisma.ticket_categories, filterDto, {
      where,
      include: {
        updater: {
          select: { name: true },
        },
        _count: {
          select: { tickets: true },
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
    const category = await this.prisma.ticket_categories.findUnique({
      where: { id },
      include: {
        updater: {
          select: { name: true },
        },
        _count: {
          select: { tickets: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Ticket Category with ID ${id} not found`);
    }

    const { updater, ...rest } = category;
    return {
      ...rest,
      updated_by: updater?.name ?? null,
    };
  }

  async update(
    id: number,
    updateCategoryDto: UpdateTicketCategoryDto,
    userId?: number,
  ) {
    await this.findOne(id);

    return this.prisma.ticket_categories.update({
      where: { id },
      data: {
        ...updateCategoryDto,
        updated_by: userId ? Number(userId) : undefined,
      },
    });
  }

  async toggleArchive(id: number, userId?: number) {
    const category = await this.findOne(id);

    return this.prisma.ticket_categories.update({
      where: { id },
      data: {
        is_archived: !category.is_archived,
        updated_by: userId ? Number(userId) : undefined,
      },
    });
  }

  async remove(id: number) {
    const category = await this.findOne(id);

    if (category._count.tickets > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.name}" because it has ${category._count.tickets} active tickets. Please archive it instead.`,
      );
    }

    return this.prisma.ticket_categories.delete({
      where: { id },
    });
  }
}
