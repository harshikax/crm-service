import { Module } from '@nestjs/common';
import { KbCategoriesService } from './kb-categories.service';
import { KbCategoriesController } from './kb-categories.controller';

@Module({
  providers: [KbCategoriesService],
  controllers: [KbCategoriesController]
})
export class KbCategoriesModule {}
