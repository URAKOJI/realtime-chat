import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}

  async create(chatRoomUid: string, senderUid: string, content: string) {
    const message = await this.messageModel.create({
      chatRoomUid,
      senderUid,
      content,
    });

    return {
      _id: message._id.toString(),
      chatRoomUid: message.chatRoomUid,
      senderUid: message.senderUid,
      content: message.content,
      createdAt: message.createdAt,
    };
  }

  async findByChatRoomUid(chatRoomUid: string, limit = 30, cursor?: string) {
    if (cursor && !Types.ObjectId.isValid(cursor)) {
      throw new BadRequestException('올바르지 않은 cursor입니다.');
    }

    const where: {
      chatRoomUid: string;
      _id?: {
        $lt: Types.ObjectId;
      };
    } = {
      chatRoomUid,
    };

    if (cursor) {
      where._id = {
        $lt: new Types.ObjectId(cursor),
      };
    }
    const messages = await this.messageModel
      .find(where)
      .sort({
        _id: -1,
      })
      .limit(limit + 1)
      .lean()
      .exec();

    const hasNextPage = messages.length > limit;

    if (hasNextPage) {
      messages.pop();
    }

    const nextCursor =
      hasNextPage && messages.length > 0
        ? messages[messages.length - 1]._id.toString()
        : null;

    return {
      messages,
      nextCursor,
    };
  }

  async findMessageById(messageId: string, chatRoomUid: string) {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new BadRequestException('올바르지 않은 메시지 ID입니다.');
    }

    const message = await this.messageModel
      .findOne({
        _id: new Types.ObjectId(messageId),
        chatRoomUid,
      })
      .lean()
      .exec();

    if (!message) {
      throw new NotFoundException('메시지를 찾을 수 없습니다.');
    }

    return message;
  }

  async isMessageNewer(
    chatRoomUid: string,
    currentMessageId: string,
    targetMessageId: string,
  ): Promise<boolean> {
    if (
      !Types.ObjectId.isValid(currentMessageId) ||
      !Types.ObjectId.isValid(targetMessageId)
    ) {
      throw new BadRequestException('올바르지 않은 메시지 ID입니다.');
    }

    if (currentMessageId === targetMessageId) {
      return false;
    }

    const currentMessage = await this.messageModel
      .findOne({
        _id: new Types.ObjectId(currentMessageId),
        chatRoomUid,
      })
      .select({
        _id: 1,
        createdAt: 1,
      })
      .lean()
      .exec();

    if (!currentMessage) {
      throw new NotFoundException('기존 읽음 메시지를 찾을 수 없습니다.');
    }

    const targetMessage = await this.messageModel
      .findOne({
        _id: new Types.ObjectId(targetMessageId),
        chatRoomUid,
        $or: [
          {
            createdAt: {
              $gt: currentMessage.createdAt,
            },
          },
          {
            createdAt: currentMessage.createdAt,
            _id: {
              $gt: currentMessage._id,
            },
          },
        ],
      })
      .select({
        _id: 1,
      })
      .lean()
      .exec();

    return Boolean(targetMessage);
  }

  async countUnreadMessages(
    chatRoomUid: string,
    userUid: string,
    lastReadMessageId: string | null,
  ): Promise<number> {
    // 한 번도 읽은 기록이 없다면
    // 상대방이 보낸 모든 메시지가 unread
    if (!lastReadMessageId) {
      return this.messageModel.countDocuments({
        chatRoomUid,
        senderUid: {
          $ne: userUid,
        },
      });
    }

    if (!Types.ObjectId.isValid(lastReadMessageId)) {
      throw new BadRequestException(
        '올바르지 않은 마지막 읽음 메시지 ID입니다.',
      );
    }

    const lastReadMessage = await this.messageModel
      .findOne({
        _id: new Types.ObjectId(lastReadMessageId),
        chatRoomUid,
      })
      .select({
        _id: 1,
        createdAt: 1,
      })
      .lean()
      .exec();

    if (!lastReadMessage) {
      /*
       * PostgreSQL에는 읽음 포인터가 있는데
       * MongoDB 메시지가 삭제된 비정상 상황.
       *
       * 지금 프로젝트에서는 0으로 숨기기보다
       * 오류로 보는 편이 낫다.
       */
      throw new NotFoundException('마지막 읽음 메시지를 찾을 수 없습니다.');
    }

    return this.messageModel.countDocuments({
      chatRoomUid,

      // 내가 보낸 메시지는 unread에서 제외
      senderUid: {
        $ne: userUid,
      },

      $or: [
        {
          createdAt: {
            $gt: lastReadMessage.createdAt,
          },
        },
        {
          createdAt: lastReadMessage.createdAt,
          _id: {
            $gt: lastReadMessage._id,
          },
        },
      ],
    });
  }

  async findLastMessageByChatRoomUid(chatRoomUid: string) {
    const message = await this.messageModel
      .findOne({
        chatRoomUid,
      })
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .lean()
      .exec();

    if (!message) {
      return null;
    }

    return {
      _id: message._id.toString(),
      senderUid: message.senderUid,
      content: message.content,
      createdAt: message.createdAt,
    };
  }
}
