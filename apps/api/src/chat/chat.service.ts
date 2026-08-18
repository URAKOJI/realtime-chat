import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FRIENDSHIP_STATUS } from 'friends/constants/friendship-status.constant';
import { PrismaService } from 'src/prisma/prisma.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async createOneToOneRoom(currentUserUid: string, friendUid: string) {
    if (currentUserUid === friendUid) {
      throw new ForbiddenException('자기 자신과 채팅방을 생성할 수 없습니다.');
    }

    const currentUser = await this.prisma.user.findUnique({
      where: {
        uid: currentUserUid,
        deletedAt: null,
      },
      select: {
        id: true,
        uid: true,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const friend = await this.prisma.user.findUnique({
      where: {
        uid: friendUid,
      },
      select: {
        id: true,
        uid: true,
        nickname: true,
        friendCode: true,
      },
    });

    if (!friend) {
      throw new NotFoundException('친구 사용자를 찾을 수 없습니다.');
    }

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: FRIENDSHIP_STATUS.ACCEPTED,
        OR: [
          {
            requesterId: currentUser.id,
            receiverId: friend.id,
          },
          {
            requesterId: friend.id,
            receiverId: currentUser.id,
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!friendship) {
      throw new ForbiddenException(
        '친구 관계인 사용자와만 채팅할 수 있습니다.',
      );
    }

    const existingRoom = await this.prisma.chatRoom.findFirst({
      where: {
        AND: [
          {
            members: {
              some: {
                userId: currentUser.id,
              },
            },
          },
          {
            members: {
              some: {
                userId: friend.id,
              },
            },
          },
          {
            members: {
              every: {
                userId: {
                  in: [currentUser.id, friend.id],
                },
              },
            },
          },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                uid: true,
                nickname: true,
                friendCode: true,
              },
            },
          },
        },
      },
    });

    if (existingRoom && existingRoom.members.length === 2) {
      return this.mapRoom(existingRoom, currentUserUid);
    }

    const room = await this.prisma.chatRoom.create({
      data: {
        uid: uuidv7(),
        members: {
          create: [
            {
              userId: currentUser.id,
            },
            {
              userId: friend.id,
            },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                uid: true,
                nickname: true,
                friendCode: true,
              },
            },
          },
        },
      },
    });

    return this.mapRoom(room, currentUserUid);
  }

  async findMyRooms(currentUserUid: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: {
        uid: currentUserUid,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        members: {
          some: {
            userId: currentUser.id,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                uid: true,
                nickname: true,
                friendCode: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return rooms.map((room) => this.mapRoom(room, currentUserUid));
  }

  async validateRoomMember(chatRoomUid: string, userUid: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: {
        uid: chatRoomUid,
      },
      select: {
        id: true,
        members: {
          where: {
            user: {
              uid: userUid,
            },
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.');
    }

    if (room.members.length === 0) {
      throw new ForbiddenException('채팅방에 접근할 권한이 없습니다.');
    }

    return room;
  }

  async findRoom(chatRoomUid: string, currentUserUid: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: {
        uid: chatRoomUid,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                uid: true,
                nickname: true,
                friendCode: true,
              },
            },
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.');
    }

    const isMember = room.members.some(
      (member) => member.user.uid === currentUserUid,
    );

    if (!isMember) {
      throw new ForbiddenException('채팅방에 접근할 권한이 없습니다.');
    }

    const friend = room.members.find(
      (member) => member.user.uid !== currentUserUid,
    )?.user;

    return {
      uid: room.uid,
      friend: friend
        ? {
            uid: friend.uid,
            nickname: friend.nickname,
            friendCode: friend.friendCode,
          }
        : null,
      createdAt: room.createdAt,
    };
  }

  private mapRoom(
    room: {
      uid: string;
      createdAt: Date;
      members: {
        user: {
          uid: string;
          nickname: string;
          friendCode: string;
        };
      }[];
    },
    currentUserUid: string,
  ) {
    const friend = room.members.find(
      (member) => member.user.uid !== currentUserUid,
    )?.user;

    return {
      uid: room.uid,
      friend: friend
        ? {
            uid: friend.uid,
            friendCode: friend.friendCode,
            nickname: friend.nickname,
          }
        : null,
      createdAt: room.createdAt,
    };
  }
}
