import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { DepartmentsModule } from './departments/departments.module';
import { TicketCategoriesModule } from './ticket-categories/ticket-categories.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { KbCategoriesModule } from './kb-categories/kb-categories.module';
import { DropdownsModule } from './dropdowns/dropdowns.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    DepartmentsModule,
    TicketCategoriesModule,
    KbCategoriesModule,
    DropdownsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
