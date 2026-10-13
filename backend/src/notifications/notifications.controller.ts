import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { Notification } from './notification.entity';
import { NotificationPreference } from './notification-preference.entity';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { UnregisterPushTokenDto } from './dto/unregister-push-token.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Get currently logged-in user's notifications" })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async getUserNotifications(
    @CurrentUser() user: JwtPayload,
  ): Promise<Notification[]> {
    return this.notificationsService.getUserNotifications(user.sub);
  }

  @Get('user')
  @ApiOperation({ summary: "Get current user's notifications (alias)" })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async getUserNotificationsAlias(
    @CurrentUser() user: JwtPayload,
  ): Promise<Notification[]> {
    return this.notificationsService.getUserNotifications(user.sub);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ count: number }> {
    return this.notificationsService.getUnreadCount(user.sub);
  }

  @Get('preferences')
  @ApiOperation({
    summary: 'Get notification preferences (creates default on first access)',
  })
  async getPreferences(
    @CurrentUser() user: JwtPayload,
  ): Promise<NotificationPreference> {
    return this.notificationsService.getPreferences(user.sub);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(
    @CurrentUser() user: JwtPayload,
    @Body() body: Partial<NotificationPreference>,
  ): Promise<NotificationPreference> {
    return this.notificationsService.updatePreferences(user.sub, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single notification by ID' })
  @ApiParam({ name: 'id', example: '1' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<Notification> {
    return this.notificationsService.findById(parseInt(id, 10), user.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', example: '1' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<Notification> {
    return this.notificationsService.markAsRead(parseInt(id, 10), user.sub);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all user notifications as read' })
  async markAllAsRead(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean }> {
    await this.notificationsService.markAllAsRead(user.sub);
    return { success: true };
  }

  @Post('push-token')
  @ApiOperation({ summary: "Register the current device's push token" })
  @ApiResponse({ status: 201, description: 'Push token registered' })
  async registerPushToken(
    @CurrentUser() user: JwtPayload,
    @Body() body: RegisterPushTokenDto,
  ): Promise<{ success: boolean }> {
    await this.notificationsService.registerPushToken(
      user.sub,
      body.token,
      body.deviceId,
      body.platform,
    );
    return { success: true };
  }

  @Delete('push-token')
  @ApiOperation({ summary: "Unregister the current device's Expo push token" })
  @ApiResponse({ status: 200, description: 'Push token unregistered' })
  async unregisterPushToken(
    @CurrentUser() user: JwtPayload,
    @Body() body: UnregisterPushTokenDto,
  ): Promise<{ success: boolean }> {
    await this.notificationsService.unregisterPushToken(user.sub, body.token);
    return { success: true };
  }
}
