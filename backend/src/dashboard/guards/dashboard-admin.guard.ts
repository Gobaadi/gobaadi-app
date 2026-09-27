import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DashboardAuthGuard } from './dashboard-auth.guard';
import type { DashboardUserPayload } from './dashboard-auth.guard';

@Injectable()
export class DashboardAdminGuard implements CanActivate {
  constructor(private readonly authGuard: DashboardAuthGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!(await this.authGuard.canActivate(context))) {
      return false;
    }
    const request = context
      .switchToHttp()
      .getRequest<{ dashboardUser?: DashboardUserPayload }>();
    const role = request.dashboardUser?.role;
    if (role !== 'admin' && role !== 'super_admin') {
      throw new ForbiddenException('Insufficient permissions for this action');
    }
    return true;
  }
}
