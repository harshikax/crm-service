import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PlatformPrismaService } from '../../platform-prisma/platform-prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { verifyPassword } from '../../common/utils/password.util';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly platformPrisma: PlatformPrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: AdminLoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.platformPrisma.platform_users.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            role_permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = verifyPassword(dto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        created_at: user.created_at,
      },
    };
  }
}
