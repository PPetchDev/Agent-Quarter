import { Module } from '@nestjs/common';
import { DialogueController } from './dialogue.controller';
import { DialogueService } from './dialogue.service';
import { ClaudeModule } from '../claude/claude.module';
import { ClaudeService } from '../claude/claude.service';
import { LLM_TEXT_PROVIDER } from '../llm/llm-provider.interface';

@Module({
  imports: [ClaudeModule],
  controllers: [DialogueController],
  providers: [DialogueService, { provide: LLM_TEXT_PROVIDER, useExisting: ClaudeService }],
})
export class DialogueModule {}
