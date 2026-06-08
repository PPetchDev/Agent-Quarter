import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(characterId: string) {
    return this.prisma.conversation.upsert({
      where: { characterId },
      update: {},
      create: { characterId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
    });
  }

  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    mood?: string,
  ) {
    return this.prisma.message.create({
      data: { conversationId, role, content, mood },
    });
  }

  async getHistory(characterId: string, limit = 20) {
    const conv = await this.prisma.conversation.findUnique({
      where: { characterId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: limit } },
    });
    return conv?.messages ?? [];
  }
}
