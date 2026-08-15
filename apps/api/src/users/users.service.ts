import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({
      data,
    });
  }

  async findByFriendCode(friendCode: string) {
    return this.prisma.user.findUnique({
      where: { friendCode },
    });
  }

  async updateLastLoginAt(uid: string) {
    return this.prisma.user.update({
      where: { uid, deletedAt: null },
      data: { lastLoginAt: new Date() },
    });
  }

  async findActiveByUid(uid: string) {
    return this.prisma.user.findFirst({
      where: {
        uid,
        deletedAt: null,
      },
    });
  }
}
