import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ClaudeService } from './claude.service';
import { toPriorTurns } from './chat-history';
import { ConversationsService } from '../conversations/conversations.service';
import { StageTracker, readCharacterMood, type IdleTier } from '@squad/core';
import { createWsValidationPipe } from '../common/validation';
import { JoinStageDto, SendMessageDto } from './dto';

// Gateway pipes also run on @ConnectedSocket params, so validation is bound to each payload only.
const validPayload = createWsValidationPipe();

@WebSocketGateway({ cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' } })
export class ClaudeGateway implements OnGatewayInit {
  @WebSocketServer() server!: Server;

  private readonly trackers = new Map<string, StageTracker>();
  private readonly idleTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly claudeSvc: ClaudeService,
    private readonly convSvc: ConversationsService,
  ) {}

  afterInit() {
    setInterval(() => this.pollTrackers(), 2_000);
  }

  private getTracker(characterId: string): StageTracker {
    if (!this.trackers.has(characterId)) {
      this.trackers.set(characterId, new StageTracker());
    }
    return this.trackers.get(characterId)!;
  }

  private pollTrackers() {
    const now = Date.now();
    for (const [characterId, tracker] of this.trackers) {
      const next = tracker.poll(now);
      if (next === 'idle') {
        this.emitStageState(characterId, 'idle', 'ready');
        this.scheduleIdleTierUpgrade(characterId);
      }
    }
  }

  private scheduleIdleTierUpgrade(characterId: string) {
    const existing = this.idleTimers.get(characterId);
    if (existing) clearTimeout(existing);

    const t1 = setTimeout(() => {
      this.emitStageState(characterId, 'idle', 'resting');
      const t2 = setTimeout(() => {
        this.emitStageState(characterId, 'idle', 'offline');
      }, 60_000);
      this.idleTimers.set(characterId, t2);
    }, 30_000);
    this.idleTimers.set(characterId, t1);
  }

  private emitStageState(characterId: string, state: 'processing' | 'idle', idleTier?: IdleTier) {
    const mood = readCharacterMood(characterId, { stageState: state, idleTier });
    this.server
      .to(`stage:${characterId}`)
      .emit('stage_state', { characterId, state, idleTier, mood });
  }

  @SubscribeMessage('join_stage')
  handleJoinStage(
    @MessageBody(validPayload) data: JoinStageDto,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`stage:${data.characterId}`);
    const tracker = this.getTracker(data.characterId);
    const mood = readCharacterMood(data.characterId, {
      stageState: tracker.currentState,
    });
    client.emit('stage_state', {
      characterId: data.characterId,
      state: tracker.currentState,
      mood,
    });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(@MessageBody(validPayload) payload: SendMessageDto) {
    const { characterId, content } = payload;
    const tracker = this.getTracker(characterId);

    const conv = await this.convSvc.getOrCreate(characterId);
    await this.convSvc.addMessage(conv.id, 'user', content);

    tracker.observeSubmit();
    this.emitStageState(characterId, 'processing');

    const history = await this.convSvc.getHistory(characterId, 20);
    const messageId = `msg_${Date.now()}`;
    const room = `stage:${characterId}`;

    let fullContent = '';
    let detectedMood: string | undefined;

    try {
      const stream = this.claudeSvc.streamResponse(characterId, toPriorTurns(history), content);

      for await (const { chunk, moodOverride } of stream) {
        fullContent += chunk;
        tracker.observeChunk();

        this.server.to(room).emit('message_chunk', { characterId, messageId, chunk });

        if (moodOverride) {
          detectedMood = moodOverride;
          this.server.to(room).emit('mood_override', { characterId, mood: moodOverride });
        }
      }

      await this.convSvc.addMessage(conv.id, 'assistant', fullContent, detectedMood);
      this.server
        .to(room)
        .emit('message_done', { characterId, messageId, fullContent, mood: detectedMood });
    } catch (err) {
      this.server.to(room).emit('message_error', { characterId, messageId, error: String(err) });
    } finally {
      tracker.forceIdle();
      this.emitStageState(characterId, 'idle', 'ready');
      this.scheduleIdleTierUpgrade(characterId);
    }
  }
}
