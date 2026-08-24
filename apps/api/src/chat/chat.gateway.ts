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
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ReadMessageDto } from './dto/read-message.dto';
import { PresenceService } from 'src/presence/presence.service';
import { FriendsService } from 'src/friends/friends.service';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3003'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly redisService: RedisService,
    private readonly chatService: ChatService,
    private readonly messagesService: MessagesService,
    private readonly presenceService: PresenceService,
    private readonly friendsService: FriendsService,
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

      console.log(
        `Socket connected: ${client.id} / ${userUid} / port=${process.env.PORT}`,
      );

      await client.join(`user:${userUid}`);
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

      const memberUids = await this.chatService.findRoomMemberUids(
        data.chatRoomUid,
      );

      for (const memberUid of memberUids) {
        this.server.to(`user:${memberUid}`).emit('chat:list:update', {
          chatRoomUid: data.chatRoomUid,
        });
      }

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

  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  @SubscribeMessage('message:read')
  async readMessage(
    @ConnectedSocket()
    client: AuthenticatedSocket,

    @MessageBody()
    data: ReadMessageDto,
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

      await this.messagesService.findMessageById(
        data.messageId,
        data.chatRoomUid,
      );

      for (let attempt = 0; attempt < 3; attempt++) {
        const member = await this.chatService.findRoomMember(
          data.chatRoomUid,
          userUid,
        );

        if (!member.lastReadMessageId) {
          const updated = await this.chatService.updateLastReadMessage(
            member.id,
            null,
            data.messageId,
          );

          if (updated) {
            return {
              success: true,
              messageId: data.messageId,
            };
          }

          continue;
        }

        const isNewer = await this.messagesService.isMessageNewer(
          data.chatRoomUid,
          member.lastReadMessageId,
          data.messageId,
        );

        if (!isNewer) {
          return {
            success: true,
            messageId: member.lastReadMessageId,
          };
        }

        const updated = await this.chatService.updateLastReadMessage(
          member.id,
          member.lastReadMessageId,
          data.messageId,
        );

        if (updated) {
          return {
            success: true,
            messageId: data.messageId,
          };
        }

        /**
         * updateMany가 0이면 그 사이
         * 다른 message:read가 먼저 처리된 것.
         *
         * 다시 읽어서 최신 상태 기준으로 판단.
         */
      }

      return {
        success: false,
        message: '읽음 상태 갱신에 실패했습니다.',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          message: '메시지를 찾을 수 없습니다.',
        };
      }

      if (error instanceof ForbiddenException) {
        return {
          success: false,
          message: '채팅방에 접근할 권한이 없습니다.',
        };
      }

      if (error instanceof BadRequestException) {
        return {
          success: false,
          message: '올바르지 않은 메시지 ID입니다.',
        };
      }

      console.error('message:read error', error);

      return {
        success: false,
        message: '메시지 읽음 처리 중 오류가 발생했습니다.',
      };
    }
  }

  @SubscribeMessage('chat:leave')
  async leaveChatRoom(
    @ConnectedSocket()
    client: AuthenticatedSocket,

    @MessageBody()
    data: {
      chatRoomUid: string;
    },
  ) {
    await client.leave(data.chatRoomUid);

    return {
      success: true,
      chatRoomUid: data.chatRoomUid,
    };
  }

  @SubscribeMessage('presence:heartbeat')
  async heartbeatPresence(
    @ConnectedSocket()
    client: AuthenticatedSocket,
  ) {
    const userUid = client.data.user?.uid;

    if (!userUid) {
      client.disconnect();
      return;
    }

    const becameOnline = await this.presenceService.heartbeat(userUid);

    if (becameOnline) {
      await this.emitPresenceUpdate(userUid, true);
    }

    return {
      success: true,
    };
  }

  @OnEvent('presence.expired', {
    async: true,
  })
  async handlePresenceExpired(data: { userUid: string }) {
    await this.emitPresenceUpdate(data.userUid, false);
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

  private async emitPresenceUpdate(userUid: string, isOnline: boolean) {
    const friendUids = await this.friendsService.findFriendUids(userUid);

    for (const friendUid of friendUids) {
      this.server.to(`user:${friendUid}`).emit('presence:update', {
        userUid,
        isOnline,
      });
    }
  }
}
