import { BadRequestException, Injectable } from '@nestjs/common';
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
}
