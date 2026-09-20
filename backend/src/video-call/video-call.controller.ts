import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { VideoCallService } from './video-call.service';
import { CreateSessionDto } from './dto/create-session.dto';

@ApiTags('video-call')
@Controller('video-call')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VideoCallController {
  constructor(private readonly videoCallService: VideoCallService) {}

  @Post('create')
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Create a video call session (doctor only)' })
  @ApiResponse({ status: 201, description: 'Session created' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSessionDto) {
    const session = await this.videoCallService.createSession(
      dto.appointmentId,
      user.sub,
    );
    return { sessionId: session.id, channelName: session.channelName };
  }

  @Get('join/:appointmentId')
  @ApiOperation({ summary: 'Join a video call session' })
  @ApiParam({ name: 'appointmentId', example: '1' })
  @ApiResponse({ status: 200, description: 'Token + channel info' })
  async join(
    @Param('appointmentId') appointmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.videoCallService.joinSession(
      parseInt(appointmentId, 10),
      user.sub,
    );
  }

  @Post('end/:appointmentId')
  @ApiOperation({ summary: 'End a video call session' })
  @ApiParam({ name: 'appointmentId', example: '1' })
  @ApiResponse({ status: 200, description: 'Call ended' })
  async end(
    @Param('appointmentId') appointmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.videoCallService.endSession(
      parseInt(appointmentId, 10),
      user.sub,
    );
    return { success: true };
  }

  @Get('token/:appointmentId')
  @ApiOperation({ summary: 'Get fresh Agora token for reconnection' })
  @ApiParam({ name: 'appointmentId', example: '1' })
  @ApiResponse({ status: 200, description: 'Fresh token' })
  async getToken(
    @Param('appointmentId') appointmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.videoCallService.joinSession(
      parseInt(appointmentId, 10),
      user.sub,
    );
  }
}
