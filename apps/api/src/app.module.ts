import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConversationsModule } from './conversations/conversations.module';
import { ClaudeModule } from './claude/claude.module';
import { CharactersModule } from './characters/characters.module';

@Module({
  imports: [PrismaModule, CharactersModule, ConversationsModule, ClaudeModule],
})
export class AppModule {}
