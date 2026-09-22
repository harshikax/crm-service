import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { Public } from '../../auth/public.decorator';
import { makeReturn } from '../../common/helpers/response.helper';
import { ApiStatus } from '../../common/constants/api-status.constants';

@Controller('admin')
export class AdminAuthController {
  constructor(private readonly authService: AdminAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: AdminLoginDto) {
    const result = await this.authService.login(dto);
    return makeReturn({
      statusCode: ApiStatus.SUCCESS,
      message: 'Platform admin authenticated successfully',
      data: result,
    });
  }
}
