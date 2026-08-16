import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { type AuthenticatedRequest } from 'src/common/types/authenticated-request.type';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { SearchFriendDto } from './dto/search-friend.dto';
import { SessionAuthGuard } from 'src/common/auth/session-auth.guard';

@Controller('friends')
@UseGuards(SessionAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  /**
   * 친구 코드로 사용자 검색
   */
  @Get('search')
  search(@Query() dto: SearchFriendDto) {
    return this.friendsService.searchByFriendCode(dto.friendCode);
  }

  /**
   * 친구 요청 전송
   */
  @Post('requests')
  sendRequest(
    @Req() request: AuthenticatedRequest,
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendsService.sendRequest(request.user.uid, dto.friendCode);
  }

  /**
   * 받은 친구 요청 목록
   */
  @Get('requests/received')
  getReceivedRequests(@Req() request: AuthenticatedRequest) {
    return this.friendsService.getReceivedRequests(request.user.uid);
  }

  /**
   * 친구 요청 승인
   */
  @Patch('requests/:friendshipUid/accept')
  acceptRequest(
    @Req() request: AuthenticatedRequest,
    @Param('friendshipUid', new ParseUUIDPipe()) friendshipUid: string,
  ) {
    return this.friendsService.acceptRequest(request.user.uid, friendshipUid);
  }

  /**
   * 친구 요청 거절
   */
  @Patch('requests/:friendshipUid/reject')
  rejectRequest(
    @Req() request: AuthenticatedRequest,
    @Param('friendshipUid', new ParseUUIDPipe()) friendshipUid: string,
  ) {
    return this.friendsService.rejectRequest(request.user.uid, friendshipUid);
  }

  /**
   * 친구 목록
   */
  @Get()
  getFriends(@Req() request: AuthenticatedRequest) {
    return this.friendsService.getFriends(request.user.uid);
  }

  /**
   * 친구 관계 해제
   */
  @Delete(':friendshipUid')
  async removeFriend(
    @Req() request: AuthenticatedRequest,
    @Param('friendshipUid', new ParseUUIDPipe()) friendshipUid: string,
  ) {
    await this.friendsService.removeFriend(request.user.uid, friendshipUid);

    return {
      message: '친구 관계가 해제되었습니다.',
    };
  }
}
