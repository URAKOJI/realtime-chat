import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema({
  timestamps: true,
  collection: 'messages',
})
export class Message {
  @Prop({
    required: true,
  })
  chatRoomUid!: string;

  @Prop({
    required: true,
  })
  senderUid!: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 2000,
  })
  content!: string;

  createdAt!: Date;
  updatedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({
  chatRoomUid: 1,
  createdAt: -1,
});
