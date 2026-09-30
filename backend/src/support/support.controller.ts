import {
  Body,
  Controller,
  Get,
  Optional,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateTicketDto, ReplyTicketDto } from './dto/support.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { UserRole } from '../users/user.entity';
import { SupportTicket } from './support-ticket.entity';
import { SupportTicketReply } from './support-ticket-reply.entity';

@ApiTags('support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('support/tickets')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @ApiOperation({ summary: 'Create a support ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTicketDto,
    @Optional() @UploadedFile() file?: Express.Multer.File,
  ): Promise<SupportTicket> {
    return this.supportService.create(user.sub, dto, file);
  }

  @Get()
  @ApiOperation({ summary: "List user's own tickets" })
  async listUserTickets(
    @CurrentUser() user: JwtPayload,
  ): Promise<SupportTicket[]> {
    return this.supportService.listUserTickets(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket details (owner or admin)' })
  @ApiParam({ name: 'id', example: '1' })
  async getById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<SupportTicket> {
    return this.supportService.getById(
      parseInt(id, 10),
      user.sub,
      user.role === UserRole.ADMIN,
    );
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Reply to a ticket (owner or admin)' })
  @ApiParam({ name: 'id', example: '1' })
  async reply(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ReplyTicketDto,
  ): Promise<SupportTicketReply> {
    return this.supportService.reply(
      parseInt(id, 10),
      user.sub,
      user.role === UserRole.ADMIN,
      dto,
    );
  }
}
