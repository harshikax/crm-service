import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { paginate } from '../common/utils/prisma-paginator';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDepartmentDto: CreateDepartmentDto) {
    return this.prisma.departments.create({
      data: {
        name: createDepartmentDto.name,
        description: createDepartmentDto.description,
        is_active: createDepartmentDto.is_active ?? true,
      },
    });
  }

  async findAll(query: PaginationQueryDto, isActive?: boolean) {
    const where: any = {};

    if (isActive !== undefined) {
      where.is_active = isActive;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }
    return paginate(this.prisma.departments, query, {
      where
    });
  }

  async findOne(id: number) {
    const department = await this.prisma.departments.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID "${id}" not found`);
    }

    return department;
  }

  async update(id: number, updateDepartmentDto: UpdateDepartmentDto) {
    await this.findOne(id);

    return this.prisma.departments.update({
      where: { id },
      data: updateDepartmentDto,
    });
  }

  async toggleStatus(id: number) {
    const department = await this.findOne(id);

    return this.prisma.departments.update({
      where: { id },
      data: { is_active: !department.is_active },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.departments.delete({
      where: { id },
    });
  }
}
