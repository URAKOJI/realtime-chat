import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ReadMessageDto {
  @IsString()
  @IsNotEmpty()
  chatRoomUid!: string;

  @IsString()
  @Length(24, 24)
  messageId!: string;
}
