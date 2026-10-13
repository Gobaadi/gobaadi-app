import { Controller, Post, Body, Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { FacebookAuthDto } from './dto/facebook-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new account with a password' })
  async register(@Body() body: RegisterDto) {
    this.logger.log(
      `[REQ] POST /auth/register identifier=${body.identifier} name="${body.name}" role=${body.role}`,
    );
    const result = await this.authService.register(body);
    this.logger.log(`[RES] POST /auth/register → ${result.message}`);
    return result;
  }

  @Post('login')
  @ApiOperation({ summary: 'Log in with phone/email + password' })
  async login(@Body() body: LoginDto) {
    this.logger.log(`[REQ] POST /auth/login identifier=${body.identifier}`);
    const result = await this.authService.login(body.identifier, body.password);
    this.logger.log(
      `[RES] POST /auth/login → OK userId=${result.user?.id} role=${result.user?.role}`,
    );
    return result;
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset OTP' })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    this.logger.log(
      `[REQ] POST /auth/forgot-password identifier=${body.identifier}`,
    );
    const result = await this.authService.forgotPassword(body.identifier);
    this.logger.log(`[RES] POST /auth/forgot-password → ${result.message}`);
    return result;
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using a verified reset token' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    this.logger.log(
      `[REQ] POST /auth/reset-password newPasswordLen=${body.newPassword?.length}`,
    );
    const result = await this.authService.resetPassword(
      body.resetToken,
      body.newPassword,
    );
    this.logger.log(`[RES] POST /auth/reset-password → ${result.message}`);
    return result;
  }

  @Post('send-otp')
  @ApiOperation({ summary: 'Send an OTP code to a phone number or email' })
  @ApiResponse({ status: 201, description: 'OTP generated and sent' })
  async sendOtp(@Body() body: SendOtpDto) {
    this.logger.log(
      `[REQ] POST /auth/send-otp phone=${body.phone} purpose=${body.purpose}`,
    );
    const result = await this.authService.sendOtp(body.phone, body.purpose);
    this.logger.log(`[RES] POST /auth/send-otp → ${result.message}`);
    return result;
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify an OTP code and receive a session token' })
  @ApiResponse({ status: 201, description: 'OTP verification result' })
  async verifyOtp(@Body() body: VerifyOtpDto) {
    this.logger.log(
      `[REQ] POST /auth/verify-otp phone=${body.phone} code=${body.code} purpose=${body.purpose}`,
    );
    const result = await this.authService.verifyOtp(
      body.phone,
      body.code,
      body.purpose,
    );
    this.logger.log(
      `[RES] POST /auth/verify-otp → verified=${result.verified} message="${result.message}"`,
    );
    return result;
  }

  @Post('oauth/google')
  @ApiOperation({ summary: 'Log in or register via Google ID token' })
  async googleAuth(@Body() body: GoogleAuthDto) {
    return this.authService.loginWithGoogle(body.idToken);
  }

  @Post('oauth/facebook')
  @ApiOperation({ summary: 'Log in or register via Facebook access token' })
  async facebookAuth(@Body() body: FacebookAuthDto) {
    return this.authService.loginWithFacebook(body.accessToken);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshTokens(body.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke a refresh token' })
  async logout(@Body() body: RefreshTokenDto) {
    return this.authService.logout(body.refreshToken);
  }
}
