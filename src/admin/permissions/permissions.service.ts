import { Injectable } from '@nestjs/common';
import { PlatformPrismaService } from '../../platform-prisma/platform-prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/utils/prisma-paginator';

@Injectable()
export class PermissionsService {
  constructor(private readonly platformPrisma: PlatformPrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const result = await paginate(
      this.platformPrisma.platform_permissions,
      query,
      {
        where,
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { code: 'asc' },
      },
    );

    const formattedData = result.data.map((p: any) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category?.name || 'General',
      description: p.description,
    }));

    return {
      data: formattedData,
      pagination: result.pagination,
    };
  }

  async getCategories(query: PaginationQueryDto) {
    const where: any = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const result = await paginate(
      this.platformPrisma.platform_permission_categories,
      query,
      {
        where,
        include: {
          permissions: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
            },
            orderBy: { code: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      },
    );

    const formattedData = result.data.map((c: any) => ({
      id: c.id,
      category: c.name,
      permissions: c.permissions.map((p: any) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        category: c.name,
        description: p.description,
      })),
    }));

    return {
      data: formattedData,
      pagination: result.pagination,
    };
  }
}
