import { Controller, Get } from '@nestjs/common';
import { DropdownsService } from './dropdowns.service';
import { makeReturn } from '../common/helpers/response.helper';

@Controller('dropdowns')
export class DropdownsController {
  constructor(private readonly dropdownsService: DropdownsService) {}

  @Get('departments')
  async getDepartments() {
    const data = await this.dropdownsService.getDepartments();
    return makeReturn({ data });
  }

  @Get('ticket-categories')
  async getTicketCategories() {
    const data = await this.dropdownsService.getTicketCategories();
    return makeReturn({ data });
  }

  @Get('kb-categories')
  async getKbCategories() {
    const data = await this.dropdownsService.getKbCategories();
    return makeReturn({ data });
  }
}
