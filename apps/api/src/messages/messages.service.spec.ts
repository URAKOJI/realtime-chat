import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Message } from './schemas/message.schema';
import { MessagesService } from './messages.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('MessagesService', () => {
  let messagesService: MessagesService;

  const messageModelMock = {
    countDocuments: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: getModelToken(Message.name),
          useValue: messageModelMock,
        },
      ],
    }).compile();

    messagesService = moduleRef.get<MessagesService>(MessagesService);

    jest.clearAllMocks();
  });

  it('서비스가 생성되어야 한다', () => {
    expect(messagesService).toBeDefined();
  });

  it('읽은 기록이 없으면 상대방이 보낸 모든 메시지를 unread로 계산한다', async () => {
    messageModelMock.countDocuments.mockResolvedValue(3);

    const result = await messagesService.countUnreadMessages(
      'room-1',
      'user-a',
      null,
    );

    expect(result).toBe(3);

    expect(messageModelMock.countDocuments).toHaveBeenCalledWith({
      chatRoomUid: 'room-1',
      senderUid: {
        $ne: 'user-a',
      },
    });
  });

  it('마지막 읽음 메시지 이후의 상대 메시지만 unread로 계산한다', async () => {
    const lastReadMessage = {
      _id: '68a123456789012345678901',
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
    };

    const execMock = jest.fn().mockResolvedValue(lastReadMessage);

    const leanMock = jest.fn(() => ({
      exec: execMock,
    }));

    const selectMock = jest.fn(() => ({
      lean: leanMock,
    }));

    messageModelMock.findOne.mockReturnValue({
      select: selectMock,
    });

    messageModelMock.countDocuments.mockResolvedValue(2);

    const result = await messagesService.countUnreadMessages(
      'room-1',
      'user-a',
      '68a123456789012345678901',
    );

    expect(result).toBe(2);

    expect(messageModelMock.countDocuments).toHaveBeenCalledTimes(1);
  });

  it('lastReadMessageId가 올바른 ObjectId가 아니면 예외를 발생시킨다', async () => {
    await expect(
      messagesService.countUnreadMessages('room-1', 'user-a', 'invalid-id'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(messageModelMock.countDocuments).not.toHaveBeenCalled();
  });

  it('마지막 읽음 메시지가 존재하지 않으면 예외를 발생시킨다', async () => {
    const execMock = jest.fn().mockResolvedValue(null);

    const leanMock = jest.fn(() => ({
      exec: execMock,
    }));

    const selectMock = jest.fn(() => ({
      lean: leanMock,
    }));

    messageModelMock.findOne.mockReturnValue({
      select: selectMock,
    });

    await expect(
      messagesService.countUnreadMessages(
        'room-1',
        'user-a',
        '68a123456789012345678901',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(messageModelMock.countDocuments).not.toHaveBeenCalled();
  });

  it('채팅방의 최신 메시지를 반환한다', async () => {
    const message = {
      _id: {
        toString: () => 'message-1',
      },
      senderUid: 'user-b',
      content: '안녕하세요',
      createdAt: new Date('2026-08-20T12:00:00.000Z'),
    };

    const execMock = jest.fn().mockResolvedValue(message);

    const leanMock = jest.fn(() => ({
      exec: execMock,
    }));

    const sortMock = jest.fn(() => ({
      lean: leanMock,
    }));

    messageModelMock.findOne.mockReturnValue({
      sort: sortMock,
    });

    const result = await messagesService.findLastMessageByChatRoomUid('room-1');

    expect(result).toEqual({
      _id: 'message-1',
      senderUid: 'user-b',
      content: '안녕하세요',
      createdAt: new Date('2026-08-20T12:00:00.000Z'),
    });
  });

  it('채팅방에 메시지가 없으면 null을 반환한다', async () => {
    const execMock = jest.fn().mockResolvedValue(null);

    const leanMock = jest.fn(() => ({
      exec: execMock,
    }));

    const sortMock = jest.fn(() => ({
      lean: leanMock,
    }));

    messageModelMock.findOne.mockReturnValue({
      sort: sortMock,
    });

    const result = await messagesService.findLastMessageByChatRoomUid('room-1');

    expect(result).toBeNull();
  });
});
