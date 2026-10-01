import {
  Injectable,
  BadRequestException,
  BadGatewayException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { DoctorsService } from '../doctors/doctors.service';
import { User, UserRole } from '../users/user.entity';
import { RefreshToken } from './refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { OtpPurpose } from './otp-purpose.type';
import { ResetTokenPayload } from './reset-token-payload.interface';
import { EmailClientService } from '../mail/email-client.service';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ACCESS_TOKEN_EXPIRES_IN = '15m';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface OtpRecord {
  code: string;
  purpose: OtpPurpose;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // In-memory fallback if Redis is unavailable
  private otpMemoryFallback = new Map<
    string,
    { record: OtpRecord; expiresAt: number }
  >();

  constructor(
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
    private readonly doctorsService: DoctorsService,
    private readonly jwtService: JwtService,
    private readonly emailClient: EmailClientService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  private toPublicUser(user: User): Partial<User> {
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      name: user.name,
      verified: user.verified,
    };
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  private async issueAccessToken(user: User): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        role: user.role,
        phone: user.phone,
        name: user.name,
      },
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
    );
  }

  private async issueRefreshToken(userId: number): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = this.refreshTokenRepository.create({
      userId,
      tokenHash: this.hashToken(rawToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });
    await this.refreshTokenRepository.save(refreshToken);
    return rawToken;
  }

  private async issueTokenPair(user: User): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.issueAccessToken(user),
      this.issueRefreshToken(user.id),
    ]);
    return { accessToken, refreshToken };
  }

  async refreshTokens(rawRefreshToken: string): Promise<TokenPair> {
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

    const user = await this.usersService.findById(existing.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate: revoke the used token before issuing a new pair so a stolen
    // refresh token cannot be replayed after the legitimate client rotates.
    await this.refreshTokenRepository.update(existing.id, {
      revokedAt: new Date(),
    });
    return this.issueTokenPair(user);
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

  async sendOtp(
    phone: string,
    purpose: OtpPurpose = 'login',
    notifyEmail?: string,
  ): Promise<{ success: boolean; message: string; otp?: string }> {
    if (!phone) {
      throw new BadRequestException('Phone number or email is required');
    }
    this.logger.log(`sendOtp: req target=${phone} purpose=${purpose}`);

    // Generate a random 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expirySeconds = 300; // 5 minutes
    const record: OtpRecord = { code: otp, purpose };
    this.logger.log(
      `sendOtp: generated OTP=${otp} for ${phone} (purpose=${purpose}, expires in ${expirySeconds}s)`,
    );

    // Try storing in Redis; fall back to the in-memory store when Redis is
    // unreachable. setOrThrow (not set) is required here: set() swallows the
    // error, so this catch block would never run and verifyOtp would later
    // find nothing stored — breaking registration/verification entirely.
    let storage: 'redis' | 'memory' = 'redis';
    try {
      await this.redisService.setOrThrow(
        `otp:${phone}`,
        JSON.stringify(record),
        expirySeconds,
      );
      this.logger.log(
        `sendOtp: OTP stored in Redis (key=otp:${phone}, EX ${expirySeconds}s)`,
      );
    } catch (err) {
      storage = 'memory';
      this.logger.warn(
        `sendOtp: Redis unavailable, storing OTP in in-memory fallback for this instance: ${(err as Error).message}`,
      );
      this.otpMemoryFallback.set(phone, {
        record,
        expiresAt: Date.now() + expirySeconds * 1000,
      });
    }

    // If the identifier is an email, or a separate email was supplied
    // alongside a phone identifier, send OTP email via Gmail SMTP from this backend.
    const emailTarget = phone.includes('@') ? phone : notifyEmail;
    if (emailTarget) {
      const subject = 'Your Gobadi Verification OTP Code';
      this.logger.log(
        `sendOtp: sending email → recipient/owner=${emailTarget} subject="${subject}" otp=${otp} storage=${storage}`,
      );
      try {
        const result = await this.emailClient.sendEmail({
          to: emailTarget,
          subject,
          text: `Hello,\n\nYour Gobadi verification OTP is: ${otp}.\nThis code is valid for 5 minutes.\n\nBest regards,\nGobadi App Team`,
          html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background-color:#F3F1EC;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0">Your verification code is ${otp}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F1EC;padding:32px 16px"><tr><td align="center"><table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%"><tr><td align="center" style="padding-bottom:24px"><div style="width:56px;height:56px;border-radius:14px;background-color:#C0612B;text-align:center;line-height:56px;font-size:24px;font-weight:700;color:#fff">G</div><div style="margin-top:8px;font-size:20px;font-weight:700;color:#4E4540;letter-spacing:0.2px">Gobadi</div></td></tr><tr><td style="background-color:#FFFFFF;border:1px solid #E7E1D8;border-radius:16px;padding:32px 28px"><h1 style="margin:0 0 16px;font-size:18px;color:#4E4540">Verify your account</h1><div style="font-size:15px;line-height:1.6;color:#4E4540"><p>Hello,</p><p>Use the code below to verify your Gobadi account. It is valid for <strong>5 minutes</strong>.</p><div style="margin:20px 0;text-align:center"><span style="display:inline-block;padding:14px 28px;border-radius:12px;background-color:#F3F1EC;border:1px dashed #C0612B;font-size:28px;font-weight:700;letter-spacing:8px;color:#9C4E22">${otp}</span></div><p>If you did not request this, you can safely ignore this email.</p></div></td></tr><tr><td align="center" style="padding-top:24px;font-size:12px;color:#8A8078">Gobadi App &middot; This is an automated message, please do not reply.</td></tr></table></td></tr></table></body></html>`,
          meta: { type: 'otp', purpose },
        });
        if (result.success) {
          this.logger.log(
            `sendOtp: email SENT recipient=${result.data?.recipient} messageId=${result.data?.messageId}`,
          );
        } else {
          this.logger.error(
            `sendOtp: email FAILED recipient=${emailTarget} code=${result.error?.code} desc="${result.error?.description}"`,
          );
          throw new BadGatewayException(
            'Failed to send verification email. Please try again.',
          );
        }
      } catch (err) {
        if (err instanceof BadGatewayException) {
          throw err;
        }
        const error = err as { code?: string; message?: string };
        this.logger.error(
          `Failed to send OTP email to ${emailTarget}: ${error.code || 'UNKNOWN'} — ${error.message}`,
        );
        throw new BadGatewayException(
          'Failed to send verification email. Please try again.',
        );
      }
    } else {
      this.logger.warn(
        `sendOtp: NO delivery channel for ${phone} — no SMS provider configured; OTP stored (storage=${storage}) and logged above only`,
      );
    }

    this.logger.log(
      `sendOtp: done target=${phone} purpose=${purpose} delivery=${emailTarget ? 'email' : 'none'}`,
    );
    return {
      success: true,
      message: `OTP sent successfully to ${phone}`,
      // Only surface the OTP outside production, for local/manual testing convenience.
      ...(process.env.NODE_ENV !== 'production' ? { otp } : {}),
    };
  }

  async verifyOtp(
    phone: string,
    code: string,
    purpose: OtpPurpose = 'login',
  ): Promise<{
    verified: boolean;
    accessToken?: string;
    refreshToken?: string;
    resetToken?: string;
    user?: Partial<User>;
    message: string;
  }> {
    if (!phone || !code) {
      throw new BadRequestException('Phone number and OTP code are required');
    }
    this.logger.log(
      `verifyOtp: req target=${phone} code=${code} purpose=${purpose}`,
    );

    let savedRecord: OtpRecord | null = null;

    try {
      const raw = await this.redisService.getOrThrow(`otp:${phone}`);
      if (raw) {
        savedRecord = JSON.parse(raw) as OtpRecord;
        this.logger.log(`verifyOtp: OTP record found in Redis for ${phone}`);
      }
    } catch {
      // Redis unreachable — consult the in-memory fallback below.
      this.logger.warn(
        `verifyOtp: Redis unreachable while reading OTP for ${phone}`,
      );
    }

    // Check the in-memory store whenever Redis had no record: the OTP may
    // have been written there (Redis was down at send time) or Redis may
    // have come back up between send and verify.
    if (!savedRecord) {
      const entry = this.otpMemoryFallback.get(phone);
      if (entry && entry.expiresAt > Date.now()) {
        savedRecord = entry.record;
        this.logger.log(
          `verifyOtp: OTP record found in in-memory fallback for ${phone}`,
        );
      }
    }

    if (!savedRecord) {
      this.logger.warn(
        `verifyOtp: rejected — no OTP record for ${phone} (expired or never sent)`,
      );
      throw new BadRequestException(
        'OTP has expired or does not exist. Please request a new one.',
      );
    }

    if (savedRecord.code !== code) {
      this.logger.warn(
        `verifyOtp: rejected — code mismatch for ${phone}: stored=${savedRecord.code} received=${code}`,
      );
      throw new BadRequestException('Invalid OTP code. Please try again.');
    }
    this.logger.log(`verifyOtp: code matched for ${phone} (stored=${code})`);

    // Defense in depth: if the caller specified what it expected this OTP to be
    // for, reject a mismatch rather than trusting the stored purpose blindly.
    if (savedRecord.purpose !== purpose) {
      this.logger.warn(
        `verifyOtp: rejected — purpose mismatch for ${phone}: stored=${savedRecord.purpose} received=${purpose}`,
      );
      throw new BadRequestException('Invalid OTP code. Please try again.');
    }

    // Only consume the OTP once it has actually been verified — deleting it
    // on every attempt let a single mistyped code lock the user out of the
    // still-valid one until they requested a brand new OTP.
    try {
      await this.redisService.delOrThrow(`otp:${phone}`);
    } catch {
      // ignore; memory fallback cleared below
    }
    this.otpMemoryFallback.delete(phone);
    this.logger.log(
      `verifyOtp: OTP consumed (deleted from store) for ${phone}`,
    );

    if (savedRecord.purpose === 'reset') {
      const user =
        (await this.usersService.findByPhone(phone)) ??
        (await this.usersService.findByEmail(phone));
      if (!user) {
        this.logger.warn(
          `verifyOtp: rejected — no account for reset OTP ${phone}`,
        );
        throw new BadRequestException('No account found for this identifier.');
      }
      const resetToken = await this.jwtService.signAsync(
        { sub: user.id, purpose: 'password-reset' } satisfies ResetTokenPayload,
        { expiresIn: '10m' },
      );
      this.logger.log(
        `verifyOtp: OK purpose=reset userId=${user.id} — reset token issued (10m)`,
      );
      return {
        verified: true,
        resetToken,
        message: 'OTP verified successfully.',
      };
    }

    if (savedRecord.purpose === 'verify') {
      const user =
        (await this.usersService.findByPhone(phone)) ??
        (await this.usersService.findByEmail(phone));
      if (!user) {
        this.logger.warn(
          `verifyOtp: rejected — no account for verify OTP ${phone}`,
        );
        throw new BadRequestException('No account found for this identifier.');
      }
      await this.usersService.markVerified(user.id);
      if (user.role === UserRole.DOCTOR) {
        await this.doctorsService.createProfileForUser(user);
      }
      const { accessToken, refreshToken } = await this.issueTokenPair(user);
      this.logger.log(
        `verifyOtp: OK purpose=verify userId=${user.id} marked verified — token pair issued`,
      );
      return {
        verified: true,
        accessToken,
        refreshToken,
        user: this.toPublicUser({ ...user, verified: true }),
        message: 'OTP verified successfully.',
      };
    }

    // purpose === 'login': preserve original auto-register-on-first-verify behavior
    const user = await this.usersService.findOrCreateByPhone(phone);
    const { accessToken, refreshToken } = await this.issueTokenPair(user);
    this.logger.log(
      `verifyOtp: OK purpose=login userId=${user.id} — token pair issued (auto-register on first verify preserved)`,
    );
    return {
      verified: true,
      accessToken,
      refreshToken,
      user: this.toPublicUser(user),
      message: 'OTP verified successfully.',
    };
  }

  async register(
    dto: RegisterDto,
  ): Promise<{ success: boolean; message: string }> {
    const isEmail = dto.identifier.includes('@');
    this.logger.log(
      `register: req identifier=${dto.identifier} name="${dto.name}" role=${dto.role}`,
    );
    const existing = isEmail
      ? await this.usersService.findByEmail(dto.identifier)
      : await this.usersService.findByPhone(dto.identifier);
    if (existing) {
      this.logger.warn(
        `register: rejected — account already exists for ${dto.identifier} (userId=${existing.id})`,
      );
      throw new ConflictException(
        isEmail
          ? 'An account with this email already exists.'
          : 'An account with this phone number already exists.',
      );
    }
    this.logger.log(
      `register: no existing account for ${dto.identifier}, continuing`,
    );

    const passwordHash = await bcrypt.hash(dto.password, 10);
    this.logger.log('register: password hashed (bcrypt cost 10)');

    // Send the OTP before persisting the account: if email delivery fails the
    // user gets an error and can retry registration cleanly, instead of being
    // stuck with a created-but-unverified account and a 409 on retry.
    this.logger.log('register: requesting OTP verification code first');
    await this.sendOtp(dto.identifier, 'verify');

    const created = await this.usersService.createWithPassword({
      name: dto.name,
      phone: isEmail ? undefined : dto.identifier,
      email: isEmail ? dto.identifier : undefined,
      role: dto.role,
      passwordHash,
    });
    this.logger.log(
      `register: user created userId=${created.id} identifier=${dto.identifier} role=${dto.role} verified=false`,
    );

    return {
      success: true,
      message:
        'Registered successfully. Please verify your account with the code sent to you.',
    };
  }

  async login(
    identifier: string,
    password: string,
  ): Promise<TokenPair & { user: Partial<User> }> {
    this.logger.log(`login: looking up identifier=${identifier}`);
    const user =
      await this.usersService.findByIdentifierWithPassword(identifier);
    if (!user) {
      this.logger.warn(`login: rejected — no user found for ${identifier}`);
      throw new UnauthorizedException('Invalid credentials.');
    }
    if (!user.password) {
      this.logger.warn(
        `login: rejected — userId=${user.id} has no password (OTP-only account?)`,
      );
      throw new UnauthorizedException('Invalid credentials.');
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      this.logger.warn(
        `login: rejected — password mismatch for userId=${user.id} (${identifier})`,
      );
      throw new UnauthorizedException('Invalid credentials.');
    }
    this.logger.log(`login: password matched for userId=${user.id}`);

    if (!user.verified) {
      this.logger.warn(
        `login: rejected — userId=${user.id} not verified yet (OTP not completed)`,
      );
      throw new ForbiddenException(
        'Please verify your account before signing in.',
      );
    }

    const { accessToken, refreshToken } = await this.issueTokenPair(user);
    this.logger.log(
      `login: OK userId=${user.id} role=${user.role} — token pair issued (access 15m, refresh 30d)`,
    );
    return { accessToken, refreshToken, user: this.toPublicUser(user) };
  }

  async forgotPassword(
    identifier: string,
  ): Promise<{ success: boolean; message: string }> {
    const user =
      (await this.usersService.findByPhone(identifier)) ??
      (await this.usersService.findByEmail(identifier));
    if (!user) {
      // Do not reveal whether the account exists.
      return {
        success: true,
        message:
          'If an account exists for this identifier, a reset code has been sent.',
      };
    }
    await this.sendOtp(identifier, 'reset');
    return {
      success: true,
      message:
        'If an account exists for this identifier, a reset code has been sent.',
    };
  }

  async resetPassword(
    resetToken: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    let payload: ResetTokenPayload;
    try {
      payload =
        await this.jwtService.verifyAsync<ResetTokenPayload>(resetToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token.');
    }
    if (payload.purpose !== 'password-reset') {
      throw new UnauthorizedException('Invalid reset token.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.setPassword(payload.sub, passwordHash);
    return { success: true, message: 'Password reset successfully.' };
  }

  async loginWithGoogle(
    idToken: string,
  ): Promise<TokenPair & { user: Partial<User> }> {
    const audience = [
      process.env.GOOGLE_CLIENT_ID_WEB,
      process.env.GOOGLE_CLIENT_ID_IOS,
      process.env.GOOGLE_CLIENT_ID_ANDROID,
    ].filter((id): id is string => Boolean(id));
    const client = new OAuth2Client();

    const payload = await (async () => {
      try {
        const ticket = await client.verifyIdToken({
          idToken,
          audience,
        });
        return ticket.getPayload();
      } catch {
        throw new UnauthorizedException('Invalid Google token.');
      }
    })();
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid Google token.');
    }

    const user = await this.usersService.findOrCreateByOAuth({
      provider: 'google',
      providerId: payload.sub,
      email: payload.email,
      name: payload.name,
    });
    const { accessToken, refreshToken } = await this.issueTokenPair(user);
    return { accessToken, refreshToken, user: this.toPublicUser(user) };
  }

  async loginWithFacebook(
    accessToken: string,
  ): Promise<TokenPair & { user: Partial<User> }> {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const debugResponse = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`,
    );
    const debugBody = (await debugResponse.json().catch(() => null)) as {
      data?: { is_valid?: boolean; app_id?: string };
    } | null;
    if (
      !debugResponse.ok ||
      !debugBody?.data?.is_valid ||
      debugBody.data.app_id !== appId
    ) {
      throw new UnauthorizedException('Invalid Facebook token.');
    }

    const response = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!response.ok) {
      throw new UnauthorizedException('Invalid Facebook token.');
    }
    const profile = (await response.json()) as {
      id: string;
      name?: string;
      email?: string;
    };
    if (!profile?.id) {
      throw new UnauthorizedException('Invalid Facebook token.');
    }

    const user = await this.usersService.findOrCreateByOAuth({
      provider: 'facebook',
      providerId: profile.id,
      email: profile.email,
      name: profile.name,
    });
    const tokenPair = await this.issueTokenPair(user);
    return { ...tokenPair, user: this.toPublicUser(user) };
  }
}
