import { Controller, Post, Body, Get, Patch, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { AdminSendOtpDto } from './dto/admin-send-otp.dto';
import { AdminVerifyOtpDto } from './dto/admin-verify-otp.dto';
import { AdminForgotPasswordDto } from './dto/admin-forgot-password.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { AdminRefreshTokenDto } from './dto/admin-refresh-token.dto';
import { AdminUpdateProfileDto } from './dto/admin-update-profile.dto';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import type { AdminJwtPayload } from './decorators/current-admin.decorator';

@ApiTags('admin-auth')
@Controller('admins')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Admin login with email and password' })
  async login(@Body() body: AdminLoginDto) {
    return this.adminAuthService.login(body.email, body.password);
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a new admin (super_admin only)' })
  async register(@Body() body: AdminRegisterDto) {
    return this.adminAuthService.register(body);
  }

  @Post('send-otp')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Send OTP to admin email' })
  async sendOtp(@Body() body: AdminSendOtpDto) {
    return this.adminAuthService.sendOtp(body.email, body.purpose);
  }

  @Post('verify-otp')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify admin OTP' })
  async verifyOtp(@Body() body: AdminVerifyOtpDto) {
    return this.adminAuthService.verifyOtp(body.email, body.code, body.purpose);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Request admin password reset' })
  async forgotPassword(@Body() body: AdminForgotPasswordDto) {
    return this.adminAuthService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset admin password' })
  async resetPassword(@Body() body: AdminResetPasswordDto) {
    return this.adminAuthService.resetPassword(
      body.resetToken,
      body.newPassword,
    );
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh admin access token' })
  async refresh(@Body() body: AdminRefreshTokenDto) {
    return this.adminAuthService.refreshTokens(body.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout admin' })
  async logout(@Body() body: AdminRefreshTokenDto) {
    return this.adminAuthService.logout(body.refreshToken);
  }

  @Get('profile')
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: 'Get admin profile' })
  async getProfile(@CurrentAdmin() admin: AdminJwtPayload) {
    return this.adminAuthService.getProfile(admin.sub);
  }

  @Patch('profile')
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: 'Update admin profile' })
  async updateProfile(
    @CurrentAdmin() admin: AdminJwtPayload,
    @Body() body: AdminUpdateProfileDto,
  ) {
    return this.adminAuthService.updateProfile(admin.sub, body);
  }
}
