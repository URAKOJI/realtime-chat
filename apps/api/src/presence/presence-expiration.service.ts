import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { RedisService } from '../redis/redis.service';

@Injectable()
export class PresenceExpirationService implements OnModuleInit {
  private readonly presencePrefix = 'presence:';

  constructor(
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.redisService.subscribeExpired(async (key) => {
      if (!key.startsWith(this.presencePrefix)) {
        return;
      }

      const userUid = key.slice(this.presencePrefix.length);

      if (!userUid) {
        return;
      }

      /**
       * 여러 NestJS 인스턴스가 같은 expired 이벤트를
       * 받아도 한 인스턴스만 처리하도록 짧은 lock 사용
       */
      const lockAcquired = await this.redisService.setIfNotExists(
        `presence-expired-lock:${userUid}`,
        '1',
        5,
      );

      if (!lockAcquired) {
        return;
      }

      this.eventEmitter.emit('presence.expired', {
        userUid,
      });
    });
  }
}
