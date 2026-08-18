import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { FRIENDSHIP_STATUS } from 'friends/constants/friendship-status.constant';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async searchByFriendCode(friendCode: string) {
    const user = await this.usersService.findByFriendCode(
      friendCode.trim().toUpperCase(),
    );

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return {
      friendCode: user.friendCode,
      nickname: user.nickname,
    };
  }

  async sendRequest(currentUserUid: string, friendCode: string) {
    const currentUser = await this.usersService.findActiveByUid(currentUserUid);

    if (!currentUser) {
      throw new UnauthorizedException('사용자 정보를 확인할 수 없습니다.');
    }

    const targetUser = await this.usersService.findByFriendCode(
      friendCode.trim().toUpperCase(),
    );

    if (!targetUser) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (currentUser.id === targetUser.id) {
      throw new BadRequestException(
        '자기 자신에게 친구 요청을 보낼 수 없습니다.',
      );
    }

    const existingFriendship = await this.findRelationship(
      currentUser.id,
      targetUser.id,
    );

    if (existingFriendship) {
      if (
        existingFriendship.status === FRIENDSHIP_STATUS.ACCEPTED &&
        !existingFriendship.deletedAt
      ) {
        throw new ConflictException('이미 친구인 사용자입니다.');
      }

      if (
        existingFriendship.status === FRIENDSHIP_STATUS.PENDING &&
        !existingFriendship.deletedAt
      ) {
        throw new ConflictException('이미 친구 요청이 진행 중입니다.');
      }

      // 이전에 거절되었거나 친구 관계가 해제된 경우
      // 기존 row를 다시 PENDING 상태로 재사용
      const friendship = await this.prisma.friendship.update({
        where: {
          id: existingFriendship.id,
        },
        data: {
          requesterId: currentUser.id,
          receiverId: targetUser.id,
          status: FRIENDSHIP_STATUS.PENDING,
          acceptedAt: null,
          deletedAt: null,
        },
      });

      return {
        uid: friendship.uid,
        status: friendship.status,
      };
    }

    const friendship = await this.prisma.friendship.create({
      data: {
        uid: uuidv7(),
        requesterId: currentUser.id,
        receiverId: targetUser.id,
        status: FRIENDSHIP_STATUS.PENDING,
      },
    });

    return {
      uid: friendship.uid,
      status: friendship.status,
    };
  }

  async getReceivedRequests(currentUserUid: string) {
    const currentUser = await this.usersService.findActiveByUid(currentUserUid);

    if (!currentUser) {
      throw new UnauthorizedException('사용자 정보를 확인할 수 없습니다.');
    }

    const requests = await this.prisma.friendship.findMany({
      where: {
        receiverId: currentUser.id,
        status: FRIENDSHIP_STATUS.PENDING,
        deletedAt: null,
      },
      select: {
        uid: true,
        createdAt: true,
        requester: {
          select: {
            friendCode: true,
            nickname: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requests.map((request) => ({
      friendshipUid: request.uid,
      friendCode: request.requester.friendCode,
      nickname: request.requester.nickname,
      requestedAt: request.createdAt,
    }));
  }

  async acceptRequest(currentUserUid: string, friendshipUid: string) {
    const currentUser = await this.usersService.findActiveByUid(currentUserUid);

    if (!currentUser) {
      throw new UnauthorizedException('사용자 정보를 확인할 수 없습니다.');
    }

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        uid: friendshipUid,
        receiverId: currentUser.id,
        status: FRIENDSHIP_STATUS.PENDING,
        deletedAt: null,
      },
    });

    if (!friendship) {
      throw new NotFoundException('처리 가능한 친구 요청을 찾을 수 없습니다.');
    }

    const updatedFriendship = await this.prisma.friendship.update({
      where: {
        id: friendship.id,
      },
      data: {
        status: FRIENDSHIP_STATUS.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    return {
      uid: updatedFriendship.uid,
      status: updatedFriendship.status,
    };
  }

  async rejectRequest(currentUserUid: string, friendshipUid: string) {
    const currentUser = await this.usersService.findActiveByUid(currentUserUid);

    if (!currentUser) {
      throw new UnauthorizedException('사용자 정보를 확인할 수 없습니다.');
    }

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        uid: friendshipUid,
        receiverId: currentUser.id,
        status: FRIENDSHIP_STATUS.PENDING,
        deletedAt: null,
      },
    });

    if (!friendship) {
      throw new NotFoundException('처리 가능한 친구 요청을 찾을 수 없습니다.');
    }

    const updatedFriendship = await this.prisma.friendship.update({
      where: {
        id: friendship.id,
      },
      data: {
        status: FRIENDSHIP_STATUS.REJECTED,
        deletedAt: new Date(),
      },
    });

    return {
      uid: updatedFriendship.uid,
      status: updatedFriendship.status,
    };
  }

  async getFriends(currentUserUid: string) {
    const currentUser = await this.usersService.findActiveByUid(currentUserUid);

    if (!currentUser) {
      throw new UnauthorizedException('사용자 정보를 확인할 수 없습니다.');
    }

    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: FRIENDSHIP_STATUS.ACCEPTED,
        deletedAt: null,
        OR: [
          {
            requesterId: currentUser.id,
          },
          {
            receiverId: currentUser.id,
          },
        ],
      },
      select: {
        uid: true,
        requesterId: true,
        requester: {
          select: {
            uid: true,
            friendCode: true,
            nickname: true,
          },
        },
        receiver: {
          select: {
            uid: true,
            friendCode: true,
            nickname: true,
          },
        },
      },
    });

    return friendships.map((friendship) => {
      const friend =
        friendship.requesterId === currentUser.id
          ? friendship.receiver
          : friendship.requester;

      return {
        friendshipUid: friendship.uid,
        uid: friend.uid,
        friendCode: friend.friendCode,
        nickname: friend.nickname,
      };
    });
  }

  async removeFriend(
    currentUserUid: string,
    friendshipUid: string,
  ): Promise<void> {
    const currentUser = await this.usersService.findActiveByUid(currentUserUid);

    if (!currentUser) {
      throw new UnauthorizedException('사용자 정보를 확인할 수 없습니다.');
    }

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        uid: friendshipUid,
        status: FRIENDSHIP_STATUS.ACCEPTED,
        deletedAt: null,
        OR: [
          {
            requesterId: currentUser.id,
          },
          {
            receiverId: currentUser.id,
          },
        ],
      },
    });

    if (!friendship) {
      throw new NotFoundException('친구 관계를 찾을 수 없습니다.');
    }

    await this.prisma.friendship.update({
      where: {
        id: friendship.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  private async findRelationship(userIdA: bigint, userIdB: bigint) {
    return this.prisma.friendship.findFirst({
      where: {
        OR: [
          {
            requesterId: userIdA,
            receiverId: userIdB,
          },
          {
            requesterId: userIdB,
            receiverId: userIdA,
          },
        ],
      },
    });
  }
}
