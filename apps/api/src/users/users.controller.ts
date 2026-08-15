import {
  Controller,
  Get,
  NotFoundException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import type { AuthenticatedRequest } from 'src/common/types/authenticated-request.type';
import { SessionAuthGuard } from 'src/common/auth/session-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(SessionAuthGuard)
  @Get('me')
  async me(@Req() request: AuthenticatedRequest) {
    console.log('AuthenticatedRequest:', request.user);
    const user = await this.usersService.findActiveByUid(request.user.uid);

    if (!user) {
      throw new NotFoundException('사용자 정보를 찾을 수 없습니다.');
    }

    return {
      uid: user.uid,
      email: user.email,
      nickname: user.nickname,
      friendCode: user.friendCode,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
