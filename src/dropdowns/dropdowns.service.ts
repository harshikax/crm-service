import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  TicketStatus,
  Priority,
  SystemType,
  ReceivedFrom,
} from '../common/enums/crm.enum';
import { enumToDropdown } from '../common/utils/enum.util';

@Injectable()
export class DropdownsService {
  constructor(private readonly prisma: PrismaService) {}

  // Departments
  async getDepartments() {
    const items = await this.prisma.departments.findMany({
      where: { is_active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return items.map((item) => ({ key: item.id, value: item.name }));
  }

  // Ticket Categories
  async getTicketCategories() {
    const items = await this.prisma.ticket_categories.findMany({
      where: { is_archived: false },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return items.map((item) => ({ key: item.id, value: item.name }));
  }

  // KB Categories
  async getKbCategories() {
    const items = await this.prisma.kb_categories.findMany({
      where: { is_archived: false },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return items.map((item) => ({ key: item.id, value: item.name }));
  }

  // Ticket Statuses
  getTicketStatuses() {
    return enumToDropdown(TicketStatus);
  }

  // Ticket Priorities
  getTicketPriorities() {
    return enumToDropdown(Priority);
  }

  // System Types 
  getSystemTypes() {
    return enumToDropdown(SystemType);
  }

  // Received From 
  getReceivedFrom() {
    return enumToDropdown(ReceivedFrom);
  }
}
