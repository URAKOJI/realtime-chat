import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { AuthCommonModule } from 'src/common/auth/auth-common.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersModule } from 'src/users/users.module';
import { PresenceModule } from 'src/presence/presence.module';

@Module({
  imports: [PrismaModule, AuthCommonModule, UsersModule, PresenceModule],
  providers: [FriendsService],
  controllers: [FriendsController],
  exports: [FriendsService],
})
export class FriendsModule {}
