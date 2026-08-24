jest.mock('uuid', () => ({
  v7: jest.fn(() => 'test-room-uuid'),
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { PresenceService } from '../presence/presence.service';

describe('ChatService', () => {
  let chatService: ChatService;

  type UpdateLastReadArgs = {
    where: {
      id: bigint;
      lastReadMessageId: string | null;
    };
    data: {
      lastReadMessageId: string;
      lastReadAt: Date;
    };
  };

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
    },
    friendship: {
      findFirst: jest.fn(),
    },
    chatRoom: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    chatRoomMember: {
      findFirst: jest.fn(),
      updateMany: jest.fn<Promise<{ count: number }>, [UpdateLastReadArgs]>(),
    },
  };

  const messagesServiceMock = {
    countUnreadMessages: jest.fn(),
    findLastMessageByChatRoomUid: jest.fn(),
  };

  const presenceServiceMock = {
    isOnline: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: MessagesService,
          useValue: messagesServiceMock,
        },
        {
          provide: PresenceService,
          useValue: presenceServiceMock,
        },
      ],
    }).compile();

    chatService = moduleRef.get(ChatService);

    jest.clearAllMocks();
  });

  it('서비스가 생성되어야 한다', () => {
    expect(chatService).toBeDefined();
  });

  it('친구 관계가 아니면 채팅방을 생성할 수 없다', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: BigInt(1),
        uid: 'user-a',
      })
      .mockResolvedValueOnce({
        id: BigInt(2),
        uid: 'user-b',
        nickname: 'B',
        friendCode: 'BBBBBBBB',
      });

    prismaMock.friendship.findFirst.mockResolvedValue(null);

    await expect(
      chatService.createOneToOneRoom('user-a', 'user-b'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prismaMock.chatRoom.create).not.toHaveBeenCalled();
  });

  it('기존 1:1 채팅방이 있으면 새로 생성하지 않는다', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: BigInt(1),
        uid: 'user-a',
      })
      .mockResolvedValueOnce({
        id: BigInt(2),
        uid: 'user-b',
        nickname: 'B',
        friendCode: 'BBBBBBBB',
      });

    prismaMock.friendship.findFirst.mockResolvedValue({
      id: BigInt(10),
    });

    prismaMock.chatRoom.findFirst.mockResolvedValue({
      uid: 'room-1',
      createdAt: new Date(),
      members: [
        {
          user: {
            uid: 'user-a',
            nickname: 'A',
            friendCode: 'AAAAAAAA',
          },
        },
        {
          user: {
            uid: 'user-b',
            nickname: 'B',
            friendCode: 'BBBBBBBB',
          },
        },
      ],
    });

    const result = await chatService.createOneToOneRoom('user-a', 'user-b');

    expect(result.uid).toBe('room-1');

    expect(prismaMock.chatRoom.create).not.toHaveBeenCalled();
  });

  it('채팅방 멤버가 아니면 접근할 수 없다', async () => {
    prismaMock.chatRoom.findUnique.mockResolvedValue({
      id: BigInt(1),
      members: [],
    });

    await expect(
      chatService.validateRoomMember('room-1', 'user-a'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('존재하지 않는 채팅방이면 NotFoundException을 발생시킨다', async () => {
    prismaMock.chatRoom.findUnique.mockResolvedValue(null);

    await expect(
      chatService.validateRoomMember('room-1', 'user-a'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('읽음 위치 변경은 기존 lastReadMessageId가 일치할 때만 성공한다', async () => {
    prismaMock.chatRoomMember.updateMany.mockResolvedValue({
      count: 1,
    });

    const result = await chatService.updateLastReadMessage(
      BigInt(1),
      'old-message-id',
      'new-message-id',
    );

    expect(result).toBe(true);

    expect(prismaMock.chatRoomMember.updateMany).toHaveBeenCalledTimes(1);

    const call = prismaMock.chatRoomMember.updateMany.mock.calls[0][0];

    expect(call.where).toEqual({
      id: BigInt(1),
      lastReadMessageId: 'old-message-id',
    });

    expect(call.data.lastReadMessageId).toBe('new-message-id');
    expect(call.data.lastReadAt).toBeInstanceOf(Date);
  });

  it('읽음 상태가 이미 변경된 경우 업데이트 실패를 반환한다', async () => {
    prismaMock.chatRoomMember.updateMany.mockResolvedValue({
      count: 0,
    });

    const result = await chatService.updateLastReadMessage(
      BigInt(1),
      'old-message-id',
      'new-message-id',
    );

    expect(result).toBe(false);
  });

  it('자기 자신과 채팅방을 생성할 수 없다', async () => {
    await expect(
      chatService.createOneToOneRoom('user-a', 'user-a'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();

    expect(prismaMock.chatRoom.create).not.toHaveBeenCalled();
  });

  it('대상 사용자가 존재하지 않으면 채팅방을 생성할 수 없다', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: BigInt(1),
        uid: 'user-a',
      })
      .mockResolvedValueOnce(null);

    await expect(
      chatService.createOneToOneRoom('user-a', 'user-b'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prismaMock.friendship.findFirst).not.toHaveBeenCalled();

    expect(prismaMock.chatRoom.create).not.toHaveBeenCalled();
  });

  it('친구 관계이고 기존 채팅방이 없으면 새로운 채팅방을 생성한다', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: BigInt(1),
        uid: 'user-a',
      })
      .mockResolvedValueOnce({
        id: BigInt(2),
        uid: 'user-b',
        nickname: 'B',
        friendCode: 'BBBBBBBB',
      });

    prismaMock.friendship.findFirst.mockResolvedValue({
      id: BigInt(10),
    });

    prismaMock.chatRoom.findFirst.mockResolvedValue(null);

    prismaMock.chatRoom.create.mockResolvedValue({
      uid: 'test-room-uuid',
      createdAt: new Date('2026-08-25T00:00:00.000Z'),
      members: [
        {
          user: {
            uid: 'user-a',
            nickname: 'A',
            friendCode: 'AAAAAAAA',
          },
        },
        {
          user: {
            uid: 'user-b',
            nickname: 'B',
            friendCode: 'BBBBBBBB',
          },
        },
      ],
    });

    const result = await chatService.createOneToOneRoom('user-a', 'user-b');

    expect(result.uid).toBe('test-room-uuid');

    expect(result.friend?.uid).toBe('user-b');

    expect(prismaMock.chatRoom.create).toHaveBeenCalledTimes(1);
  });

  it('채팅방 멤버이면 채팅방 접근 검증에 성공한다', async () => {
    prismaMock.chatRoom.findUnique.mockResolvedValue({
      id: BigInt(1),
      members: [
        {
          id: BigInt(10),
        },
      ],
    });

    const result = await chatService.validateRoomMember('room-1', 'user-a');

    expect(result).toEqual({
      id: BigInt(1),
      members: [
        {
          id: BigInt(10),
        },
      ],
    });
  });
});
