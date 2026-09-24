import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { assertTestDatabase } from '../prisma/test-database';
import { ConversationsService } from './conversations.service';

// Fail at collection time, before any hook can touch a real database.
assertTestDatabase();

const CHARACTER_ID = 'history-window-test';

describe('ConversationsService.getHistory', () => {
  let prisma: PrismaService;
  let service: ConversationsService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    service = new ConversationsService(prisma);
    await prisma.conversation.deleteMany({ where: { characterId: CHARACTER_ID } });
  });

  afterAll(async () => {
    await prisma.conversation.deleteMany({ where: { characterId: CHARACTER_ID } });
    await prisma.$disconnect();
  });

  it('returns the most recent messages in chronological order', async () => {
    const conv = await service.getOrCreate(CHARACTER_ID);
    const start = Date.UTC(2026, 0, 1);
    await prisma.message.createMany({
      data: Array.from({ length: 25 }, (_, i) => ({
        conversationId: conv.id,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `msg-${i}`,
        createdAt: new Date(start + i * 1000),
      })),
    });

    const history = await service.getHistory(CHARACTER_ID, 20);

    expect(history.map((m) => m.content)).toEqual(
      Array.from({ length: 20 }, (_, i) => `msg-${i + 5}`),
    );
  });
});
