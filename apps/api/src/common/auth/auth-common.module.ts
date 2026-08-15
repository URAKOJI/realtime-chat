import { Module } from '@nestjs/common';
import { RedisModule } from 'src/redis/redis.module';
import { SessionAuthGuard } from './session-auth.guard';

@Module({
  imports: [RedisModule],
  providers: [SessionAuthGuard],
  exports: [SessionAuthGuard, RedisModule],
})
export class AuthCommonModule {}
