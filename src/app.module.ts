import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PlatformPrismaModule } from './platform-prisma/platform-prisma.module';
import { DepartmentsModule } from './departments/departments.module';
import { TicketCategoriesModule } from './ticket-categories/ticket-categories.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { KbCategoriesModule } from './kb-categories/kb-categories.module';
import { DropdownsModule } from './dropdowns/dropdowns.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { AdminModule } from './admin/admin.module';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';

@Module({
  imports: [
    PrismaModule,
    PlatformPrismaModule,
    AdminModule,
    AuthModule,
    DepartmentsModule,
    TicketCategoriesModule,
    KbCategoriesModule,
    DropdownsModule,
    KnowledgeBaseModule,
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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}

