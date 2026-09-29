import {
  Injectable,
  BadRequestException,
  BadGatewayException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  Admin,
  AdminRole,
  AdminDesignation,
  AdminStatus,
} from './entities/admin.entity';
import { AdminRefreshToken } from './entities/admin-refresh-token.entity';
import { RedisService } from '../redis/redis.service';
import { EmailClientService } from '../mail/email-client.service';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ACCESS_TOKEN_EXPIRES_IN = '15m';

export interface AdminTokenPair {
  accessToken: string;
  refreshToken: string;
}

interface OtpRecord {
  code: string;
  purpose: 'verify' | 'reset';
}

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  private otpMemoryFallback = new Map<
    string,
    { record: OtpRecord; expiresAt: number }
  >();

  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(AdminRefreshToken)
    private readonly refreshTokenRepository: Repository<AdminRefreshToken>,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly emailClient: EmailClientService,
  ) {}

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  private toPublicAdmin(admin: Admin): Partial<Admin> {
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      avatar: admin.avatar,
      role: admin.role,
      designation: admin.designation,
      status: admin.status,
      verified: admin.verified,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };
  }

  private async issueAccessToken(admin: Admin): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: admin.id,
        role: admin.role,
        type: 'admin' as const,
      },
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
    );
  }

  private async issueRefreshToken(adminId: number): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = this.refreshTokenRepository.create({
      adminId,
      tokenHash: this.hashToken(rawToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });
    await this.refreshTokenRepository.save(refreshToken);
    return rawToken;
  }

  private async issueTokenPair(admin: Admin): Promise<AdminTokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.issueAccessToken(admin),
      this.issueRefreshToken(admin.id),
    ]);
    return { accessToken, refreshToken };
  }

  async login(
    email: string,
    password: string,
  ): Promise<AdminTokenPair & { admin: Partial<Admin> }> {
    const normalizedEmail = email.trim().toLowerCase();
    const admin = await this.adminRepository
      .createQueryBuilder('admin')
      .addSelect('admin.password')
      .where('admin.email = :email', { email: normalizedEmail })
      .getOne();

    if (!admin || !admin.password) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const matches = await bcrypt.compare(password, admin.password);
    if (!matches) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!admin.verified) {
      throw new ForbiddenException(
        'Please verify your account before signing in.',
      );
    }

    if (admin.status === AdminStatus.DEACTIVE) {
      throw new ForbiddenException('Your account has been deactivated.');
    }

    const { accessToken, refreshToken } = await this.issueTokenPair(admin);
    return { accessToken, refreshToken, admin: this.toPublicAdmin(admin) };
  }

  async register(
    dto: {
      name?: string;
      email: string;
      password: string;
      role?: AdminRole;
      designation: AdminDesignation;
      avatar?: string;
      status?: AdminStatus;
    },
    createdByAdminId?: number,
  ): Promise<{ success: boolean; message: string }> {
    // Only super_admin can create admins
    if (createdByAdminId) {
      const creator = await this.adminRepository.findOneBy({
        id: createdByAdminId,
      });
      if (!creator || creator.role !== AdminRole.SUPER_ADMIN) {
        throw new ForbiddenException('Only super admins can create admins.');
      }
    }

    const existing = await this.adminRepository.findOneBy({
      email: dto.email,
    });
    if (existing) {
      throw new ConflictException('An admin with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const admin = this.adminRepository.create({
      name: dto.name,
      email: dto.email,
      password: passwordHash,
      role: dto.role || AdminRole.ADMIN,
      designation: dto.designation,
      avatar: dto.avatar,
      status: dto.status || AdminStatus.ACTIVE,
      verified: true,
    });
    await this.adminRepository.save(admin);

    return {
      success: true,
      message: 'Admin created successfully.',
    };
  }

  async sendOtp(
    email: string,
    purpose: 'verify' | 'reset' = 'verify',
  ): Promise<{ success: boolean; message: string }> {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const admin = await this.adminRepository.findOneBy({ email });
    if (!admin) {
      // Do not reveal whether the account exists
      return {
        success: true,
        message: 'If an account exists for this email, an OTP has been sent.',
      };
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expirySeconds = 300;
    const record: OtpRecord = { code: otp, purpose };

    try {
      await this.redisService.setOrThrow(
        `admin_otp:${email}`,
        JSON.stringify(record),
        expirySeconds,
      );
    } catch (err) {
      this.logger.warn(
        `Redis unavailable, storing admin OTP in memory for this instance: ${(err as Error).message}`,
      );
      this.otpMemoryFallback.set(email, {
        record,
        expiresAt: Date.now() + expirySeconds * 1000,
      });
    }

    try {
      await this.emailClient.sendEmail({
        to: email,
        subject: 'Your Gobadi Admin Verification OTP',
        text: `Hello,\n\nYour Gobadi admin verification OTP is: ${otp}.\nThis code is valid for 5 minutes.\n\nBest regards,\nGobadi Team`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background-color:#F3F1EC;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F1EC;padding:32px 16px"><tr><td align="center"><table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%"><tr><td align="center" style="padding-bottom:24px"><div style="width:56px;height:56px;border-radius:14px;background-color:#C0612B;text-align:center;line-height:56px;font-size:24px;font-weight:700;color:#fff">G</div><div style="margin-top:8px;font20px;font-weight:700;color:#4E4540;letter-spacing:0.2px">Gobadi Admin</div></td></tr><tr><td style="background-color:#FFFFFF;border:1px solid #E7E1D8;border-radius:16px;padding:32px 28px"><h1 style="margin:0 0 16px;font-size:18px;color:#4E4540">Verify your admin account</h1><div style="font-size:15px;line-height:1.6;color:#4E4540"><p>Use the code below to verify your Gobadi admin account. It is valid for <strong>5 minutes</strong>.</p><div style="margin:20px 0;text-align:center"><span style="display:inline-block;padding:14px 28px;border-radius:12px;background-color:#F3F1EC;border:1px dashed #C0612B;font-size:28px;font-weight:700;letter-spacing:8px;color:#9C4E22">${otp}</span></div></div></td></tr></table></td></tr></table></body></html>`,
        meta: { type: 'otp', purpose },
      });
    } catch (err) {
      const error = err as { code?: string; message?: string };
      this.logger.error(
        `Failed to send admin OTP email to ${email}: ${error.code || 'UNKNOWN'} — ${error.message}`,
      );
      throw new BadGatewayException(
        'Failed to send verification email. Please try again.',
      );
    }

    return {
      success: true,
      message: 'If an account exists for this email, an OTP has been sent.',
      ...(process.env.NODE_ENV !== 'production' ? { otp } : {}),
    };
  }

  async verifyOtp(
    email: string,
    code: string,
    purpose: 'verify' | 'reset' = 'verify',
  ): Promise<{
    verified: boolean;
    accessToken?: string;
    refreshToken?: string;
    resetToken?: string;
    admin?: Partial<Admin>;
    message: string;
  }> {
    if (!email || !code) {
      throw new BadRequestException('Email and OTP code are required');
    }

    let savedRecord: OtpRecord | null = null;

    try {
      const raw = await this.redisService.getOrThrow(`admin_otp:${email}`);
      if (raw) {
        savedRecord = JSON.parse(raw) as OtpRecord;
      }
    } catch {
      // Redis unreachable — consult the in-memory fallback below.
    }

    if (!savedRecord) {
      const entry = this.otpMemoryFallback.get(email);
      if (entry && entry.expiresAt > Date.now()) {
        savedRecord = entry.record;
      }
    }

    if (!savedRecord) {
      throw new BadRequestException(
        'OTP has expired or does not exist. Please request a new one.',
      );
    }

    if (savedRecord.code !== code) {
      throw new BadRequestException('Invalid OTP code. Please try again.');
    }

    if (savedRecord.purpose !== purpose) {
      throw new BadRequestException('Invalid OTP code. Please try again.');
    }

    try {
      await this.redisService.delOrThrow(`admin_otp:${email}`);
    } catch {
      // ignore; memory fallback cleared below
    }
    this.otpMemoryFallback.delete(email);

    const admin = await this.adminRepository.findOneBy({ email });
    if (!admin) {
      throw new BadRequestException('No admin account found for this email.');
    }

    if (purpose === 'reset') {
      const resetToken = await this.jwtService.signAsync(
        { sub: admin.id, purpose: 'admin-password-reset' },
        { expiresIn: '10m' },
      );
      return {
        verified: true,
        resetToken,
        message: 'OTP verified successfully.',
      };
    }

    // purpose === 'verify'
    await this.adminRepository.update(admin.id, { verified: true });
    const { accessToken, refreshToken } = await this.issueTokenPair(admin);
    return {
      verified: true,
      accessToken,
      refreshToken,
      admin: this.toPublicAdmin({ ...admin, verified: true }),
      message: 'OTP verified successfully.',
    };
  }

  async forgotPassword(
    email: string,
  ): Promise<{ success: boolean; message: string }> {
    const admin = await this.adminRepository.findOneBy({ email });
    if (!admin) {
      return {
        success: true,
        message:
          'If an account exists for this email, a reset code has been sent.',
      };
    }
    await this.sendOtp(email, 'reset');
    return {
      success: true,
      message:
        'If an account exists for this email, a reset code has been sent.',
    };
  }

  async resetPassword(
    resetToken: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    let payload: { sub: number; purpose: string };
    try {
      payload = await this.jwtService.verifyAsync(resetToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token.');
    }
    if (payload.purpose !== 'admin-password-reset') {
      throw new UnauthorizedException('Invalid reset token.');
    }

    const admin = await this.adminRepository.findOneBy({ id: payload.sub });
    if (!admin) {
      throw new NotFoundException('Admin not found.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.adminRepository.update(admin.id, { password: passwordHash });
    return { success: true, message: 'Password reset successfully.' };
  }

  async refreshTokens(rawRefreshToken: string): Promise<AdminTokenPair> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    const tokenHash = this.hashToken(rawRefreshToken);
    const existing = await this.refreshTokenRepository.findOneBy({
      tokenHash,
    });
    if (
      !existing ||
      existing.revokedAt ||
      existing.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const admin = await this.adminRepository.findOneBy({
      id: existing.adminId,
    });
    if (!admin) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.refreshTokenRepository.update(existing.id, {
      revokedAt: new Date(),
    });
    return this.issueTokenPair(admin);
  }

  async logout(rawRefreshToken: string): Promise<{ success: boolean }> {
    if (!rawRefreshToken) {
      return { success: true };
    }
    const tokenHash = this.hashToken(rawRefreshToken);
    const existing = await this.refreshTokenRepository.findOneBy({
      tokenHash,
    });
    if (
      !existing ||
      existing.revokedAt ||
      existing.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    await this.refreshTokenRepository.update(existing.id, {
      revokedAt: new Date(),
    });
    return { success: true };
  }

  async getProfile(adminId: number): Promise<Admin> {
    const admin = await this.adminRepository.findOneBy({ id: adminId });
    if (!admin) {
      throw new NotFoundException('Admin not found.');
    }
    return admin;
  }

  async updateProfile(
    adminId: number,
    dto: {
      name?: string;
      designation?: AdminDesignation;
      password?: string;
      avatar?: string;
      phone?: string;
    },
  ): Promise<Partial<Admin>> {
    const admin = await this.adminRepository.findOneBy({ id: adminId });
    if (!admin) {
      throw new NotFoundException('Admin not found.');
    }

    if (dto.name) admin.name = dto.name;
    if (dto.designation) admin.designation = dto.designation;
    if (dto.avatar !== undefined) admin.avatar = dto.avatar;
    if (dto.phone !== undefined) admin.phone = dto.phone;
    if (dto.password) {
      admin.password = await bcrypt.hash(dto.password, 10);
    }

    await this.adminRepository.save(admin);
    return this.toPublicAdmin(admin);
  }
}
