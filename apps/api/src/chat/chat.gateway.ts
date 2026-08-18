import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { parseCookie } from 'cookie';
import { RedisService } from 'src/redis/redis.service';
import { ChatService } from './chat.service';
import { type AuthenticatedSocket } from './interfaces/authenticated-socket.interface';
import { SessionData } from 'src/common/types/session-data.type';
import { Server } from 'socket.io';

import { MessagesService } from '../messages/messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import {
  ForbiddenException,
  NotFoundException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly redisService: RedisService,
    private readonly chatService: ChatService,
    private readonly messagesService: MessagesService,
  ) {}

  @WebSocketServer()
  server!: Server;

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const cookieHeader = client.handshake.headers.cookie;

      if (!cookieHeader) {
        client.disconnect();
        return;
      }

      const cookies = parseCookie(cookieHeader);

      const sessionId = cookies.sessionId;

      if (!sessionId) {
        client.disconnect();
        return;
      }

      const userUid = await this.getUserUidFromSession(sessionId);

      if (!userUid) {
        client.disconnect();
        return;
      }

      client.data.user = {
        uid: userUid,
      };

      console.log(`Socket connected: ${client.id} / ${userUid}`);
    } catch (error) {
      console.error('Socket authentication failed', error);

      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    console.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:join')
  async joinChatRoom(
    @ConnectedSocket()
    client: AuthenticatedSocket,

    @MessageBody()
    data: {
      chatRoomUid: string;
    },
  ) {
    const userUid = client.data.user?.uid;

    if (!userUid) {
      client.disconnect();

      return {
        success: false,
        message: '인증되지 않은 사용자입니다.',
      };
    }

    try {
      await this.chatService.validateRoomMember(data.chatRoomUid, userUid);

      await client.join(data.chatRoomUid);

      return {
        success: true,
        chatRoomUid: data.chatRoomUid,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          message: '채팅방을 찾을 수 없습니다.',
        };
      }

      if (error instanceof ForbiddenException) {
        return {
          success: false,
          message: '채팅방에 접근할 권한이 없습니다.',
        };
      }

      console.error('chat:join error', error);

      return {
        success: false,
        message: '채팅방 입장 중 오류가 발생했습니다.',
      };
    }
  }

  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  @SubscribeMessage('message:send')
  async sendMessage(
    @ConnectedSocket()
    client: AuthenticatedSocket,

    @MessageBody()
    data: SendMessageDto,
  ) {
    const userUid = client.data.user?.uid;

    if (!userUid) {
      client.disconnect();

      return {
        success: false,
        message: '인증되지 않은 사용자입니다.',
      };
    }

    try {
      const content = data.content.trim();

      if (!content) {
        return {
          success: false,
          message: '메시지를 입력해주세요.',
        };
      }

      await this.chatService.validateRoomMember(data.chatRoomUid, userUid);

      const message = await this.messagesService.create(
        data.chatRoomUid,
        userUid,
        content,
      );

      this.server.to(data.chatRoomUid).emit('message:new', message);

      return {
        success: true,
        message,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          message: '채팅방을 찾을 수 없습니다.',
        };
      }

      if (error instanceof ForbiddenException) {
        return {
          success: false,
          message: '채팅방에 접근할 권한이 없습니다.',
        };
      }

      console.error('message:send error', error);

      return {
        success: false,
        message: '메시지 전송 중 오류가 발생했습니다.',
      };
    }
  }

  private async getUserUidFromSession(
    sessionId: string,
  ): Promise<string | null> {
    const session = await this.redisService.get(`session:${sessionId}`);

    if (!session) {
      return null;
    }

    let sessionData: SessionData;

    try {
      sessionData = JSON.parse(session) as SessionData;
    } catch {
      return null;
    }

    return sessionData.userUid;
  }
}
