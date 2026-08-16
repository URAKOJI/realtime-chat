import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { AuthCommonModule } from 'src/common/auth/auth-common.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [PrismaModule, AuthCommonModule, UsersModule],
  providers: [FriendsService],
  controllers: [FriendsController],
})
export class FriendsModule {}
