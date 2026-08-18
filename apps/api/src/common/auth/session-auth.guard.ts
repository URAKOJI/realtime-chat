import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedRequest } from 'src/common/types/authenticated-request.type';
import { RedisService } from 'src/redis/redis.service';
import { SessionData } from '../types/session-data.type';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const sessionId = request.cookies?.sessionId as string | undefined;

    if (!sessionId) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }

    const session = await this.redisService.get(`session:${sessionId}`);

    if (!session) {
      throw new UnauthorizedException('세션이 만료되었습니다.');
    }

    let sessionData: SessionData;

    try {
      sessionData = JSON.parse(session) as SessionData;
    } catch {
      throw new UnauthorizedException('유효하지 않은 세션입니다.');
    }

    request.user = {
      uid: sessionData.userUid,
    };

    return true;
  }
}
