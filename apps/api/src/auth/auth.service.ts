import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from 'src/users/users.service';
import * as argon2 from 'argon2';
import { v7 as uuidv7 } from 'uuid';
import { randomInt } from 'node:crypto';
import { LoginDto } from './dto/login.dto';
import { RedisService } from 'src/redis/redis.service';
import { randomBytes } from 'node:crypto';

@Injectable()
export class AuthService {
  private readonly sessionTtlSeconds = 60 * 60 * 24 * 7;
  constructor(
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const uid = uuidv7();

    const friendCode = await this.generateFriendCode();

    const user = await this.usersService.create({
      uid,
      email,
      nickname: dto.nickname.trim(),
      passwordHash,
      friendCode,
    });

    return {
      uid: user.uid,
      email: user.email,
      nickname: user.nickname,
      friendCode: user.friendCode,
      createdAt: user.createdAt,
    };
  }

  async login(dto: LoginDto) {
    // 로그인 로직 구현
    const email = dto.email.trim().toLowerCase();

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    await this.usersService.updateLastLoginAt(user.uid);

    const sessionId = await this.createSession(user.uid);

    return {
      sessionId,
      user: {
        uid: user.uid,
        email: user.email,
        nickname: user.nickname,
        friendCode: user.friendCode,
      },
    };
  }

  async logout(sessionId: string) {
    await this.redisService.del(`session:${sessionId}`);
  }

  private async generateFriendCode(): Promise<string> {
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const friendCode = this.createFriendCode();

      const existingUser = await this.usersService.findByFriendCode(friendCode);

      if (!existingUser) {
        return friendCode;
      }
    }

    throw new Error('친구 코드 생성에 실패했습니다.');
  }

  private createFriendCode(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    const prefix =
      letters[randomInt(0, letters.length)] +
      letters[randomInt(0, letters.length)];

    const number = randomInt(0, 1_000_000).toString().padStart(6, '0');

    return `${prefix}${number}`;
  }

  private generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  private async createSession(userUid: string): Promise<string> {
    const sessionId = this.generateSessionId();

    await this.redisService.set(
      `session:${sessionId}`,
      JSON.stringify({
        userUid,
        createdAt: new Date().toISOString(),
      }),
      this.sessionTtlSeconds,
    );

    return sessionId;
  }
}
