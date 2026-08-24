import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: RedisClientType;
  private subscriber: RedisClientType | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.getOrThrow<string>('REDIS_HOST');
    const port = this.configService.getOrThrow<string>('REDIS_PORT');
    const password = this.configService.getOrThrow<string>('REDIS_PASSWORD');

    this.client = createClient({
      url: `redis://:${password}@${host}:${port}`,
    });
  }

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.subscriber?.isOpen) {
      await this.subscriber.quit();
    }

    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async subscribeExpired(
    listener: (key: string) => void | Promise<void>,
  ): Promise<void> {
    if (!this.subscriber) {
      this.subscriber = this.client.duplicate();

      await this.subscriber.connect();
    }

    await this.subscriber.subscribe('__keyevent@0__:expired', (key) => {
      void listener(key);
    });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, {
        EX: ttlSeconds,
      });

      return;
    }

    await this.client.set(key, value);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async setIfNotExists(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.client.set(key, value, {
      NX: true,
      EX: ttlSeconds,
    });

    return result === 'OK';
  }
}
