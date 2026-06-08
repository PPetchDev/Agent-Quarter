import { Module } from '@nestjs/common';
import { ClaudeGateway } from './claude.gateway';
import { ClaudeService } from './claude.service';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [ConversationsModule],
  providers: [ClaudeService, ClaudeGateway],
  exports: [ClaudeService],
})
export class ClaudeModule {}
