import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRequiredJwtSecret } from '../../auth/jwt-secret.util';

export interface DashboardUserPayload {
  sub: number;
  role: string;
  type?: string;
  phone?: string;
  email?: string;
}

export interface DashboardRequest {
  headers: { authorization?: string; [key: string]: unknown };
  cookies?: Record<string, string | undefined>;
  dashboardUser?: DashboardUserPayload;
}

@Injectable()
export class DashboardAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<DashboardRequest>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<DashboardUserPayload>(
        token,
        {
          secret: getRequiredJwtSecret(),
        },
      );
      request.dashboardUser = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: DashboardRequest): string | undefined {
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer') return token;
    }
    const headerToken = request.headers['x-access-token'];
    return (
      request.cookies?.token ||
      request.cookies?.adminToken ||
      request.cookies?.accessToken ||
      (typeof headerToken === 'string' ? headerToken : undefined)
    );
  }
}
