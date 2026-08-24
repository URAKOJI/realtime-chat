import { Injectable } from '@nestjs/common';

import { RedisService } from '../redis/redis.service';

@Injectable()
export class PresenceService {
  private readonly ttlSeconds = 15;

  constructor(private readonly redisService: RedisService) {}

  private getPresenceKey(userUid: string): string {
    return `presence:${userUid}`;
  }

  async heartbeat(userUid: string): Promise<boolean> {
    const key = this.getPresenceKey(userUid);

    const wasOnline = (await this.redisService.get(key)) !== null;

    await this.redisService.set(key, '1', this.ttlSeconds);

    return !wasOnline;
  }

  async isOnline(userUid: string): Promise<boolean> {
    return (await this.redisService.get(this.getPresenceKey(userUid))) !== null;
  }

  async remove(userUid: string): Promise<void> {
    await this.redisService.del(this.getPresenceKey(userUid));
  }
}
