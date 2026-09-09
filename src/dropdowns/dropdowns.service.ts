import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DropdownsService {
  constructor(private readonly prisma: PrismaService) {}

  // Departments Dropdown
  async getDepartments() {
    return this.prisma.departments.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // Ticket Categories Dropdown
  async getTicketCategories() {
    return this.prisma.ticket_categories.findMany({
      where: { is_archived: false },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // KB Categories Dropdown
  async getKbCategories() {
    return this.prisma.kb_categories.findMany({
      where: { is_archived: false },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
