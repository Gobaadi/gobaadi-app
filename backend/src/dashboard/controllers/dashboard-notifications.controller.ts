import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { DashboardNotificationsService } from '../services/dashboard-notifications.service';
import { DashboardAuthGuard } from '../guards/dashboard-auth.guard';
import { DashboardAdminGuard } from '../guards/dashboard-admin.guard';
import { CurrentDashboardUser } from '../decorators/current-dashboard-user.decorator';
import type { DashboardUserPayload } from '../guards/dashboard-auth.guard';
import {
  DashboardBroadcastNotificationDto,
  CreateNotificationDto,
  DashboardSendNotificationDto,
} from '../dto/notification.dto';

@ApiTags('dashboard-notifications')
@ApiBearerAuth()
@Controller('dashboard/notifications')
export class DashboardNotificationsController {
  constructor(
    private readonly notificationsService: DashboardNotificationsService,
  ) {}

  @Get()
  @UseGuards(DashboardAdminGuard)
  @ApiOperation({ summary: 'List all notifications (admin, searchable)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'type', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
  ) {
    return this.notificationsService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
      type,
    );
  }

  @Get('user')
  @UseGuards(DashboardAuthGuard)
  @ApiOperation({ summary: 'List current user notifications' })
  async findMine(
    @CurrentDashboardUser() user: DashboardUserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findMine(
      user.sub,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('unread-count')
  @UseGuards(DashboardAuthGuard)
  @ApiOperation({ summary: 'Unread notification count for current user' })
  async unreadCount(@CurrentDashboardUser() user: DashboardUserPayload) {
    return this.notificationsService.unreadCount(user.sub);
  }

  @Get(':id')
  @UseGuards(DashboardAdminGuard)
  @ApiOperation({ summary: 'Get notification by id (with user)' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.findOne(id);
  }

  @Post()
  @UseGuards(DashboardAdminGuard)
  @ApiOperation({ summary: 'Create notification for a user' })
  async create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Post('send')
  @UseGuards(DashboardAdminGuard)
  @ApiOperation({ summary: 'Send notification to specific users' })
  async send(@Body() dto: DashboardSendNotificationDto) {
    return this.notificationsService.send(dto);
  }

  @Post('broadcast')
  @UseGuards(DashboardAdminGuard)
  @ApiOperation({ summary: 'Broadcast notification to all users or a role' })
  async broadcast(@Body() dto: DashboardBroadcastNotificationDto) {
    return this.notificationsService.broadcast(dto);
  }

  @Patch('read-all')
  @UseGuards(DashboardAuthGuard)
  @ApiOperation({ summary: 'Mark all current user notifications as read' })
  async markAllRead(@CurrentDashboardUser() user: DashboardUserPayload) {
    await this.notificationsService.markAllRead(user.sub);
    return { success: true };
  }

  @Patch(':id/read')
  @UseGuards(DashboardAuthGuard)
  @ApiOperation({ summary: 'Mark notification as read (ownership enforced)' })
  async markRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentDashboardUser() user: DashboardUserPayload,
  ) {
    return this.notificationsService.markRead(id, user.sub);
  }

  @Delete(':id')
  @UseGuards(DashboardAdminGuard)
  @ApiOperation({ summary: 'Delete notification' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.notificationsService.remove(id);
    return { success: true, message: 'Notification deleted successfully' };
  }
}
