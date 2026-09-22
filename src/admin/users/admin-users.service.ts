import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PlatformPrismaService } from '../../platform-prisma/platform-prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { hashPassword } from '../../common/utils/password.util';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/utils/prisma-paginator';
import { Prisma } from '../../generated/platform-prisma/client';

const USER_SELECT_FIELDS = {
  id: true,
  name: true,
  email: true,
  role_id: true,
  role: {
    select: {
      id: true,
      name: true,
    },
  },
  is_active: true,
  created_at: true,
  updated_at: true,
} as const;

@Injectable()
export class AdminUsersService {
  constructor(private readonly platformPrisma: PlatformPrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const where: Prisma.platform_usersWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return paginate(this.platformPrisma.platform_users, query, {
      where,
      select: USER_SELECT_FIELDS,
      orderBy: { id: 'desc' },
    });
  }

  async findById(id: number) {
    const user = await this.platformPrisma.platform_users.findUnique({
      where: { id },
      select: USER_SELECT_FIELDS,
    });

    if (!user) {
      throw new NotFoundException(`Platform user with ID ${id} not found`);
    }

    return user;
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.platformPrisma.platform_users.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException(`User with email '${email}' already exists`);
    }

    const role = await this.platformPrisma.platform_roles.findUnique({
      where: { id: dto.role_id },
    });
    if (!role) {
      throw new BadRequestException(
        `Role with ID ${dto.role_id} does not exist`,
      );
    }

    const hashedPassword = hashPassword(dto.password);

    return this.platformPrisma.platform_users.create({
      data: {
        name: dto.name,
        email,
        password: hashedPassword,
        role_id: dto.role_id,
        is_active: true,
      },
      select: USER_SELECT_FIELDS,
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.platformPrisma.platform_users.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) {
      throw new NotFoundException(`Platform user with ID ${id} not found`);
    }

    const dataToUpdate: Prisma.platform_usersUpdateInput = {};

    if (dto.name !== undefined) {
      dataToUpdate.name = dto.name;
    }

    if (dto.email !== undefined) {
      const email = dto.email.toLowerCase().trim();
      if (email !== user.email) {
        const existing = await this.platformPrisma.platform_users.findUnique({
          where: { email },
        });
        if (existing) {
          throw new ConflictException(
            `User with email '${email}' already exists`,
          );
        }
        dataToUpdate.email = email;
      }
    }

    if (dto.is_active !== undefined) {
      if (user.role?.is_system && user.is_active && !dto.is_active) {
        const activeSystemAdminCount =
          await this.platformPrisma.platform_users.count({
            where: {
              role: { is_system: true },
              is_active: true,
            },
          });
        if (activeSystemAdminCount <= 1) {
          throw new BadRequestException(
            'Cannot deactivate the only remaining active system administrator',
          );
        }
      }
      dataToUpdate.is_active = dto.is_active;
    }

    if (dto.role_id !== undefined) {
      const role = await this.platformPrisma.platform_roles.findUnique({
        where: { id: dto.role_id },
      });
      if (!role) {
        throw new BadRequestException(
          `Role with ID ${dto.role_id} does not exist`,
        );
      }
      dataToUpdate.role = { connect: { id: dto.role_id } };
    }

    if (dto.password) {
      dataToUpdate.password = hashPassword(dto.password);
    }

    return this.platformPrisma.platform_users.update({
      where: { id },
      data: dataToUpdate,
      select: USER_SELECT_FIELDS,
    });
  }
}
