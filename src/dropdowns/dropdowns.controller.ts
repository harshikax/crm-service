import { Controller, Get } from '@nestjs/common';
import { DropdownsService } from './dropdowns.service';

@Controller('dropdowns')
export class DropdownsController {
  constructor(private readonly dropdownsService: DropdownsService) {}

  @Get('departments')
  getDepartments() {
    return this.dropdownsService.getDepartments();
  }

  @Get('ticket-categories')
  getTicketCategories() {
    return this.dropdownsService.getTicketCategories();
  }

  @Get('kb-categories')
  getKbCategories() {
    return this.dropdownsService.getKbCategories();
  }
}
