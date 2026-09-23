import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TasksService, Task } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: "Get the current user's tasks for a given day" })
  @ApiQuery({ name: 'date', required: true, example: '2026-07-27' })
  @ApiQuery({ name: 'category', required: false, example: 'field' })
  @ApiQuery({ name: 'priority', required: false, example: 'high' })
  @ApiResponse({ status: 200, description: 'List of tasks for the date' })
  async getTasks(
    @Query('date') date: string,
    @CurrentUser() user: JwtPayload,
    @Query('category') category?: string,
    @Query('priority') priority?: string,
  ): Promise<Task[]> {
    return this.tasksService.getTasksForDate(
      user.sub,
      date,
      category,
      priority,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  @ApiResponse({ status: 201, description: 'Task created' })
  async createTask(
    @Body() body: CreateTaskDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Task> {
    return this.tasksService.createTask(user.sub, body);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle a task done/undone' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  async toggleTask(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<Task> {
    return this.tasksService.toggleTask(user.sub, parseInt(id, 10));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  async updateTask(
    @Param('id') id: string,
    @Body() body: UpdateTaskDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Task> {
    return this.tasksService.updateTask(user.sub, parseInt(id, 10), body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  async deleteTask(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean }> {
    await this.tasksService.deleteTask(user.sub, parseInt(id, 10));
    return { success: true };
  }
}
