import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { DepartmentsModule } from './departments/departments.module';
import { TicketCategoriesModule } from './ticket-categories/ticket-categories.module';

@Module({
  imports: [PrismaModule, DepartmentsModule, TicketCategoriesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
