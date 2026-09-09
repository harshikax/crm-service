import { Module } from '@nestjs/common';
import { DropdownsService } from './dropdowns.service';
import { DropdownsController } from './dropdowns.controller';

@Module({
  providers: [DropdownsService],
  controllers: [DropdownsController],
})
export class DropdownsModule {}
