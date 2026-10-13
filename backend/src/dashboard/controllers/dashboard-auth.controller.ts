import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../../auth/auth.service';
import { UsersService } from '../../users/users.service';
import { RegisterDto } from '../../auth/dto/register.dto';
import { LoginDto } from '../../auth/dto/login.dto';
import { ForgotPasswordDto } from '../../auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '../../auth/dto/reset-password.dto';
import { RefreshTokenDto } from '../../auth/dto/refresh-token.dto';
import { DashboardAuthGuard } from '../guards/dashboard-auth.guard';
import type { DashboardUserPayload } from '../guards/dashboard-auth.guard';
import { CurrentDashboardUser } from '../decorators/current-dashboard-user.decorator';

@ApiTags('dashboard-auth')
@Controller('dashboard/auth')
export class DashboardAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  @ApiOperation({ summary: 'Register a new account with a password' })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  @ApiOperation({ summary: 'Log in with phone/email + password' })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.identifier, body.password);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke a refresh token' })
  async logout(@Body() body: RefreshTokenDto) {
    return this.authService.logout(body.refreshToken);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  @ApiOperation({ summary: 'Request a password reset OTP' })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.identifier);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  @ApiOperation({ summary: 'Reset password using a verified reset token' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.resetToken, body.newPassword);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshTokens(body.refreshToken);
  }

  @Get('profile')
  @UseGuards(DashboardAuthGuard)
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  async getProfile(@CurrentDashboardUser() user: DashboardUserPayload) {
    const found = await this.usersService.findById(user.sub);
    if (!found) {
      throw new NotFoundException('User not found');
    }
    return found as Omit<typeof found, 'password'>;
  }
}
