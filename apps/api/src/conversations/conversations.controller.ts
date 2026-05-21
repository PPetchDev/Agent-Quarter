import { Controller, Get, Param } from '@nestjs/common';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly svc: ConversationsService) {}

  @Get(':characterId')
  async getConversation(@Param('characterId') characterId: string) {
    return this.svc.getOrCreate(characterId);
  }

  @Get(':characterId/history')
  async getHistory(@Param('characterId') characterId: string) {
    return this.svc.getHistory(characterId);
  }
}
