import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DashboardUserPayload } from '../guards/dashboard-auth.guard';

export const CurrentDashboardUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DashboardUserPayload => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ dashboardUser?: DashboardUserPayload }>();
    return request.dashboardUser as DashboardUserPayload;
  },
);
