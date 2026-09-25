import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { MAX_CHAT_MESSAGE_LENGTH, MAX_ID_LENGTH } from '../common/validation';

export class JoinStageDto {
  @IsString() @IsNotEmpty() @MaxLength(MAX_ID_LENGTH) characterId!: string;
}

/** Content is persisted and streamed to Claude, so its length caps the token spend per message. */
export class SendMessageDto extends JoinStageDto {
  @IsString() @IsNotEmpty() @MaxLength(MAX_CHAT_MESSAGE_LENGTH) content!: string;
}
