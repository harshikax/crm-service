import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PlatformPrismaService } from '../../platform-prisma/platform-prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/utils/prisma-paginator';

const ROLE_PERMISSION_INCLUDE = {
  role_permissions: {
    include: {
      permission: {
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
      },
    },
  },
  _count: {
    select: { users: true },
  },
} as const;

function formatRole(role: any) {
  return {
    id: role.id,
    name: role.name,
    created_at: role.created_at,
    updated_at: role.updated_at,
    _count: role._count,
    permissions:
      role.role_permissions?.map((rp: any) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        name: rp.permission.name,
        category: rp.permission.category?.name || 'General',
        description: rp.permission.description,
      })) || [],
  };
}

@Injectable()
export class RolesService {
  constructor(private readonly platformPrisma: PlatformPrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const where: any = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const result = await paginate(this.platformPrisma.platform_roles, query, {
      where,
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    const formattedData = result.data.map((role: any) => ({
      id: role.id,
      name: role.name,
      created_at: role.created_at,
      updated_at: role.updated_at,
      _count: role._count,
    }));

    return {
      data: formattedData,
      pagination: result.pagination,
    };
  }

  async findById(id: number) {
    const role = await this.platformPrisma.platform_roles.findUnique({
      where: { id },
      include: ROLE_PERMISSION_INCLUDE,
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return formatRole(role);
  }

  async create(dto: CreateRoleDto) {
    const name = dto.name.trim();

    const existing = await this.platformPrisma.platform_roles.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
      },
    });
    if (existing) {
      throw new ConflictException(`Role '${name}' already exists`);
    }

    const permissionIds = dto.permission_ids || [];

    if (permissionIds.length > 0) {
      const matched = await this.platformPrisma.platform_permissions.findMany({
        where: { id: { in: permissionIds } },
        select: { id: true },
      });
      const existingIds = new Set(matched.map((p) => p.id));
      const invalidIds = permissionIds.filter((id) => !existingIds.has(id));
      if (invalidIds.length > 0) {
        throw new BadRequestException(
          `The following permission ID(s) do not exist: ${invalidIds.join(', ')}`,
        );
      }
    }

    const created = await this.platformPrisma.platform_roles.create({
      data: {
        name,
        role_permissions: {
          create: permissionIds.map((permission_id) => ({ permission_id })),
        },
      },
      include: ROLE_PERMISSION_INCLUDE,
    });

    return formatRole(created);
  }

  async update(id: number, dto: UpdateRoleDto) {
    const role = await this.platformPrisma.platform_roles.findUnique({
      where: { id },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    const dataToUpdate: any = {};
    if (dto.name) {
      const name = dto.name.trim();
      const existing = await this.platformPrisma.platform_roles.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException(`Role '${name}' already exists`);
      }
      dataToUpdate.name = name;
    }

    if (dto.permission_ids !== undefined) {
      const permissionIds = dto.permission_ids;
      if (permissionIds.length > 0) {
        const matched = await this.platformPrisma.platform_permissions.findMany(
          {
            where: { id: { in: permissionIds } },
            select: { id: true },
          },
        );
        const existingIds = new Set(matched.map((p) => p.id));
        const invalidIds = permissionIds.filter((pId) => !existingIds.has(pId));
        if (invalidIds.length > 0) {
          throw new BadRequestException(
            `The following permission ID(s) do not exist: ${invalidIds.join(', ')}`,
          );
        }
      }

      await this.platformPrisma.platform_role_permissions.deleteMany({
        where: { role_id: id },
      });

      if (permissionIds.length > 0) {
        await this.platformPrisma.platform_role_permissions.createMany({
          data: permissionIds.map((permission_id) => ({
            role_id: id,
            permission_id,
          })),
        });
      }
    }

    const updated = await this.platformPrisma.platform_roles.update({
      where: { id },
      data: dataToUpdate,
      include: ROLE_PERMISSION_INCLUDE,
    });

    return formatRole(updated);
  }

  async delete(id: number) {
    const role = await this.platformPrisma.platform_roles.findUnique({
      where: { id },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    if (role.is_system) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    const usersCount = await this.platformPrisma.platform_users.count({
      where: { role_id: id },
    });
    if (usersCount > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' because ${usersCount} user(s) are currently assigned to it`,
      );
    }

    await this.platformPrisma.platform_roles.delete({
      where: { id },
    });

    return { deleted: true, id };
  }
}
