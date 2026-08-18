import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionAuthGuard } from 'src/common/auth/session-auth.guard';
import { ChatService } from './chat.service';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { type AuthenticatedRequest } from 'src/common/types/authenticated-request.type';
import { MessagesService } from 'src/messages/messages.service';

@Controller('chat-rooms')
@UseGuards(SessionAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly messagesService: MessagesService,
  ) {}

  @Post()
  createRoom(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateChatRoomDto,
  ) {
    return this.chatService.createOneToOneRoom(request.user.uid, dto.friendUid);
  }

  @Get()
  findMyRooms(@Req() request: AuthenticatedRequest) {
    return this.chatService.findMyRooms(request.user.uid);
  }

  @Get(':chatRoomUid')
  async getRoom(
    @Req() request: AuthenticatedRequest,
    @Param('chatRoomUid') chatRoomUid: string,
  ) {
    return this.chatService.findRoom(chatRoomUid, request.user.uid);
  }

  @Get(':chatRoomUid/messages')
  async getMessages(
    @Req() request: AuthenticatedRequest,
    @Param('chatRoomUid') chatRoomUid: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    await this.chatService.validateRoomMember(chatRoomUid, request.user.uid);

    const parsedLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);

    return this.messagesService.findByChatRoomUid(
      chatRoomUid,
      parsedLimit,
      cursor,
    );
  }
}
