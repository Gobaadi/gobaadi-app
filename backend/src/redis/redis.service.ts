import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  onModuleInit() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);

    this.client = new Redis({
      host,
      port,
      password: process.env.REDIS_PASSWORD,
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      // Fail fast instead of queueing forever: with maxRetriesPerRequest: null
      // and enableOfflineQueue left on, every command issued while Redis is
      // unreachable stays pending for the lifetime of the request, hanging
      // /auth/register, /auth/send-otp and /auth/verify-otp entirely. The OTP
      // flows rely on these errors to fall back to the in-memory store.
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 5000,
      commandTimeout: 3000,
      retryStrategy: (times) => Math.min(times * 1000, 30000),
    });

    this.client.on('ready', () => {
      this.logger.log(`Redis connected (${host}:${port})`);
    });
    this.client.on('error', (err) => {
      this.logger.warn(
        `Redis connection error: ${err.message}. (Authentication Mock OTP fallback will work anyway)`,
      );
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, expireSeconds?: number): Promise<void> {
    try {
      await this.setOrThrow(key, value, expireSeconds);
    } catch (err) {
      this.logger.error('Failed to set key in Redis', err as Error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.error('Failed to delete key in Redis', err as Error);
    }
  }

  /**
   * Same as set() but surfaces Redis failures to the caller. Use where a
   * fallback (e.g. the in-memory OTP store) must run when Redis is down —
   * set() swallows the error, so callers wrapped in try/catch never fire.
   */
  async setOrThrow(
    key: string,
    value: string,
    expireSeconds?: number,
  ): Promise<void> {
    if (expireSeconds) {
      await this.client.set(key, value, 'EX', expireSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /** Same as get() but surfaces Redis failures instead of returning null. */
  async getOrThrow(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /** Same as del() but surfaces Redis failures instead of swallowing them. */
  async delOrThrow(key: string): Promise<void> {
    await this.client.del(key);
  }
}
