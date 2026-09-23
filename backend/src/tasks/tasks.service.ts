import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Task } from './task.entity';
import { RedisService } from '../redis/redis.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
export { Task } from './task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly redisService: RedisService,
  ) {}

  async getTasksForDate(
    userId: number,
    date: string,
    category?: string,
    priority?: string,
  ): Promise<Task[]> {
    const cacheKey = this.buildCacheKey(userId, date, category, priority);
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('Failed to read tasks cache from Redis', err);
    }

    const { start, end } = this.dayBounds(date);
    const where: Record<string, unknown> = {
      userId,
      scheduledTime: Between(start, end),
    };
    if (category) where.category = category;
    if (priority) where.priority = priority;

    const tasks = await this.taskRepository.find({
      where,
      order: { scheduledTime: 'ASC' },
    });

    try {
      await this.redisService.set(cacheKey, JSON.stringify(tasks), 300);
    } catch (err) {
      console.warn('Failed to write tasks cache to Redis', err);
    }

    return tasks;
  }

  async createTask(userId: number, dto: CreateTaskDto): Promise<Task> {
    const task = this.taskRepository.create({
      userId,
      title: dto.title,
      detail: dto.detail,
      scheduledTime: new Date(dto.scheduledTime),
      category: dto.category,
      priority: dto.priority,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });
    const saved = await this.taskRepository.save(task);
    await this.invalidateCacheForTask(saved);
    return saved;
  }

  async toggleTask(userId: number, id: number): Promise<Task> {
    const task = await this.getOwnedTask(userId, id);
    task.isDone = !task.isDone;
    const saved = await this.taskRepository.save(task);
    await this.invalidateCacheForTask(saved);
    return saved;
  }

  async updateTask(userId: number, id: number, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.getOwnedTask(userId, id);
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.detail !== undefined) task.detail = dto.detail;
    if (dto.scheduledTime !== undefined) task.scheduledTime = new Date(dto.scheduledTime);
    if (dto.category !== undefined) task.category = dto.category;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.dueDate !== undefined) task.dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;
    const saved = await this.taskRepository.save(task);
    await this.invalidateCacheForTask(saved);
    return saved;
  }

  async deleteTask(userId: number, id: number): Promise<void> {
    const task = await this.getOwnedTask(userId, id);
    await this.taskRepository.remove(task);
    await this.invalidateCacheForTask(task);
  }

  private async getOwnedTask(userId: number, id: number): Promise<Task> {
    const task = await this.taskRepository.findOneBy({ id });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    if (task.userId !== userId) {
      throw new ForbiddenException('You may only manage your own tasks');
    }
    return task;
  }

  private async invalidateCacheForTask(task: Task): Promise<void> {
    const date = this.toDateKey(task.scheduledTime);
    try {
      await this.redisService.del(this.buildCacheKey(task.userId, date));
    } catch (err) {
      console.warn('Failed to invalidate tasks cache in Redis', err);
    }
  }

  private buildCacheKey(
    userId: number,
    date: string,
    category?: string,
    priority?: string,
  ): string {
    const parts = [`cache:tasks:user:${userId}:date:${date}`];
    if (category) parts.push(`cat:${category}`);
    if (priority) parts.push(`pri:${priority}`);
    return parts.join(':');
  }

  private toDateKey(date: Date): string {
    return new Date(date).toISOString().slice(0, 10);
  }

  private dayBounds(date: string): { start: Date; end: Date } {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    return { start, end };
  }
}
