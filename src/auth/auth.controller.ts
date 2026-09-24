import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { TokenRequestDto } from './dto/token-request.dto';
import { AuthorizeRequestDto } from './dto/authorize-request.dto';
import { ConsentDecisionDto } from './dto/consent-decision.dto';
import { Public } from './public.decorator';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('authorize')
  async authorize(@Query() query: AuthorizeRequestDto) {
    return this.authService.authorize(query);
  }

  @Post('consent')
  @HttpCode(HttpStatus.OK)
  async processConsent(@Body() dto: ConsentDecisionDto) {
    return this.authService.processConsent(dto);
  }

  @Post('token')
  @HttpCode(HttpStatus.OK)
  async issueToken(@Body() dto: TokenRequestDto) {
    return this.authService.generateToken(dto);
  }
}
