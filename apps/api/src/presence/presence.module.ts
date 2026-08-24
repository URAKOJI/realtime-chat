import { Module } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { RedisModule } from 'src/redis/redis.module';
import { PresenceExpirationService } from './presence-expiration.service';

@Module({
  imports: [RedisModule],
  providers: [PresenceService, PresenceExpirationService],
  exports: [PresenceService],
})
export class PresenceModule {}
