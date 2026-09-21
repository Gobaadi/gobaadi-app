import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { VideoCallService } from './video-call.service';
import { CreateSessionDto } from './dto/create-session.dto';

@ApiTags('video-call')
@Controller('video-call')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VideoCallController {
  constructor(private readonly videoCallService: VideoCallService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a video call session (farmer or doctor)' })
  @ApiResponse({ status: 201, description: 'Session created' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSessionDto) {
    const session = await this.videoCallService.createSession(
      dto.appointmentId,
      user.sub,
    );
    return {
      sessionId: session.id,
      channelName: session.channelName,
      doctorUserId: session.doctorUserId,
      patientId: session.patientId,
    };
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
