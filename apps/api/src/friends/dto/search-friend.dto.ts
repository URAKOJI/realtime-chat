import { IsString, Length, Matches } from 'class-validator';

export class SearchFriendDto {
  @IsString()
  @Length(8, 8)
  @Matches(/^[A-Za-z]{2}[0-9]{6}$/)
  friendCode!: string;
}
