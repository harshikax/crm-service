import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { AdminKeyGuard } from '../guards/admin-key.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { PlatformPermission } from '../../common/enums/platform-permissions.enum';
import { Public } from '../../auth/public.decorator';
import { makeReturn } from '../../common/helpers/response.helper';
import { ApiStatus } from '../../common/constants/api-status.constants';

@Public()
@UseGuards(AdminKeyGuard, PermissionsGuard)
@RequirePermissions(PlatformPermission.APPLICATIONS_MANAGE)
@Controller()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post('tenants/:id/applications')
  async createApplication(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateApplicationDto,
  ) {
    const app = await this.applicationsService.createApplication(id, dto);
    return makeReturn({
      statusCode: ApiStatus.CREATED,
      message: 'Application registered successfully',
      data: app,
    });
  }

  @Patch('applications/:id')
  async updateApplication(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateApplicationDto,
  ) {
    const updated = await this.applicationsService.updateApplication(id, dto);
    return makeReturn({
      statusCode: ApiStatus.SUCCESS,
      message: 'Application updated successfully',
      data: updated,
    });
  }

  @Post('applications/:id/revoke')
  async revokeApplication(@Param('id', ParseIntPipe) id: number) {
    const revoked = await this.applicationsService.revokeApplication(id);
    return makeReturn({
      statusCode: ApiStatus.SUCCESS,
      message: 'Application revoked successfully',
      data: revoked,
    });
  }
}
