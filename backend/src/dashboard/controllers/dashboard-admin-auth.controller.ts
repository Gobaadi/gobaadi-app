import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminAuthService } from '../../admin/admin-auth.service';
import { S3Service } from '../../s3/s3.service';
import { AdminLoginDto } from '../../admin/dto/admin-login.dto';
import { AdminSendOtpDto } from '../../admin/dto/admin-send-otp.dto';
import { AdminVerifyOtpDto } from '../../admin/dto/admin-verify-otp.dto';
import { AdminForgotPasswordDto } from '../../admin/dto/admin-forgot-password.dto';
import { AdminResetPasswordDto } from '../../admin/dto/admin-reset-password.dto';
import { AdminRefreshTokenDto } from '../../admin/dto/admin-refresh-token.dto';
import { AdminUpdateProfileDto } from '../../admin/dto/admin-update-profile.dto';
import { DashboardAuthGuard } from '../guards/dashboard-auth.guard';
import { CurrentDashboardUser } from '../decorators/current-dashboard-user.decorator';
import type { DashboardUserPayload } from '../guards/dashboard-auth.guard';

@ApiTags('dashboard-admin-auth')
@Controller('dashboard/admins')
export class DashboardAdminAuthController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly s3Service: S3Service,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  @ApiOperation({ summary: 'Admin login with email and password' })
  async login(@Body() body: AdminLoginDto) {
    return this.adminAuthService.login(body.email, body.password);
  }

  @Post('send-otp')
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  @ApiOperation({ summary: 'Send OTP to admin email' })
  async sendOtp(@Body() body: AdminSendOtpDto) {
    return this.adminAuthService.sendOtp(body.email, body.purpose);
  }

  @Post('verify-otp')
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  @ApiOperation({ summary: 'Verify admin OTP' })
  async verifyOtp(@Body() body: AdminVerifyOtpDto) {
    return this.adminAuthService.verifyOtp(body.email, body.code, body.purpose);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  @ApiOperation({ summary: 'Request admin password reset' })
  async forgotPassword(@Body() body: AdminForgotPasswordDto) {
    return this.adminAuthService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 10, ttl: 900000 } })
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
  @UseGuards(DashboardAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout admin' })
  async logout(@Body() body: AdminRefreshTokenDto) {
    return this.adminAuthService.logout(body.refreshToken);
  }

  @Get('profile')
  @UseGuards(DashboardAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin profile' })
  async getProfile(@CurrentDashboardUser() admin: DashboardUserPayload) {
    return this.adminAuthService.getProfile(admin.sub);
  }

  @Patch('profile')
  @UseGuards(DashboardAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update admin profile (multipart avatar supported)',
  })
  async updateProfile(
    @CurrentDashboardUser() admin: DashboardUserPayload,
    @Body() body: AdminUpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let avatar: string | undefined;
    if (file?.buffer) {
      const uploaded = await this.s3Service.uploadFile(file.buffer, {
        folder: 'gobadi/avatars',
        contentType: file.mimetype,
      });
      avatar = uploaded.url;
    }
    return this.adminAuthService.updateProfile(admin.sub, {
      ...body,
      avatar,
    });
  }
}
