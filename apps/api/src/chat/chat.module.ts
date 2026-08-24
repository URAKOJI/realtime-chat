import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { AuthCommonModule } from 'src/common/auth/auth-common.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MessagesModule } from 'src/messages/messages.module';
import { ChatGateway } from './chat.gateway';
import { PresenceModule } from 'src/presence/presence.module';
import { FriendsModule } from 'src/friends/friends.module';

@Module({
  imports: [
    PrismaModule,
    AuthCommonModule,
    MessagesModule,
    PresenceModule,
    FriendsModule,
  ],
  providers: [ChatService, ChatGateway],
  controllers: [ChatController],
})
export class ChatModule {}
