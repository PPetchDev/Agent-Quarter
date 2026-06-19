# C-AGENT-DIALOGUE-001 — Agent-to-Agent Dialogue System

## Type
IMPLEMENTATION PROPOSAL (from C-GAME-RESEARCH-001)

## Status
PASS (2026-06-19) — System built during C-GAME-RESEARCH-001, verified and closed out.
Uses REST API + deterministic pools + LLM fallback (different from original Socket.io proposal).

## Goal
Enable office agents to talk to each other autonomously via LLM with visual chat bubbles in LoungeCanvas.

---

## Architecture

```
┌──────────────┐    Socket.io        ┌──────────────────┐    ┌──────────────┐
│  Agent A      │──▶ /dialogue ──────▶│  DialogueService  │───▶│  Agent B      │
│  (speaker)    │    namespace        │  (NestJS)         │    │  (listener)   │
└──────────────┘                     └──────────────────┘    └──────────────┘
       │                                      │                      │
       ▼                                      ▼                      ▼
  [LLM generates]                      [Store message]        [Trigger animation]
  [message based]                      [Route to agents]      [Show chat bubble]
  [on persona]                         [Emit to /dialogue]
```

---

## Components

### 1. Dialogue Message Schema

```typescript
// Proposed: apps/api/src/dialogue/dialogue.types.ts
interface DialogueMessage {
  id: string;
  speakerId: string;       // agent who speaks (e.g., "agent-1")
  listenerId?: string;      // target agent (undefined = broadcast)
  topic: string;            // context tag (e.g., "greeting", "task_update", "idle_chat")
  content: string;          // the actual message text
  emotion?: 'neutral' | 'happy' | 'worried' | 'excited' | 'thinking';
  timestamp: string;
}

interface DialogueEvent {
  event: 'agent.speaking' | 'agent.listening' | 'agent.replying';
  message: DialogueMessage;
}
```

### 2. DialogueGateway (Socket.io)

```typescript
// Proposed: apps/api/src/dialogue/dialogue.gateway.ts
@WebSocketGateway({ namespace: '/dialogue', cors: { origin: '*' } })
class DialogueGateway {
  @WebSocketServer() server: Server;

  // Agent sends a message
  @SubscribeMessage('agent.speak')
  handleSpeak(client: Socket, payload: DialogueMessage): void {
    // 1. Store in memory/DB
    // 2. Emit to target agent + all viewers
    this.server.emit('agent.speaking', { message: payload });
  }

  // Trigger LLM-generated dialogue between two agents
  @SubscribeMessage('dialogue.start')
  handleStartConversation(client: Socket, payload: {
    speakerId: string;
    listenerId: string;
    topic: string;
  }): void {
    // 1. Generate message via LLM
    // 2. Emit via agent.speak
  }
}
```

### 3. DialogueService (LLM Integration)

```typescript
// Proposed: apps/api/src/dialogue/dialogue.service.ts
class DialogueService {
  async generateAgentMessage(
    speaker: AgentPersona,
    listener: AgentPersona,
    topic: string
  ): Promise<string> {
    const prompt = `You are ${speaker.name}, ${speaker.personality}.
You are talking to ${listener.name}, ${listener.personality}.
Topic: ${topic}
Context: You are both in an office/lounge setting.

${speaker.name}:`;
    // Call LLM → return generated text
  }

  async generateConversation(
    agent1: AgentPersona,
    agent2: AgentPersona,
    topic: string,
    turns: number = 3
  ): Promise<DialogueMessage[]> {
    // Multi-turn conversation between two agents
  }
}
```

### 4. Agent Persona Definitions

```typescript
// Proposed: apps/api/src/dialogue/personas.ts
const AGENT_PERSONAS: Record<string, AgentPersona> = {
  'agent-1': {
    name: 'Mai',
    personality: 'Cheerful and energetic project manager. Uses emoji and exclamation marks.',
    voice: 'kawaii and enthusiastic',
    relationships: {
      'agent-2': 'close friend and trusted developer',
      'agent-3': 'respectful junior',
    },
  },
  'agent-2': {
    name: 'Ren',
    personality: 'Calm, analytical senior developer. Speaks precisely and technically.',
    voice: 'professional and measured',
    relationships: {
      'agent-1': 'respects her leadership, slightly protective',
    },
  },
  // ... more agents
};
```

### 5. Frontend Hook

```typescript
// Proposed: apps/web/src/hooks/useDialogueSocket.ts
function useDialogueSocket(callbacks: {
  onAgentSpeaking?: (msg: DialogueMessage) => void;
  onAgentListening?: (msg: DialogueMessage) => void;
}): {
  sendMessage: (msg: Partial<DialogueMessage>) => void;
  startConversation: (speakerId: string, listenerId: string, topic: string) => void;
} {
  // socket.io connection to /dialogue namespace
  // Listen for agent.speaking events
  // Return controls
}
```

---

## Visual Display (Chat Bubbles)

```
┌─────────────────────┐
│ Mai: "Good morning! │  ← Chat bubble above agent sprite
│ Ready for today's   │
│ sprint? ✨"         │
└─────────────────────┘
         ▼
     [Agent Sprite]
```

**Chat Bubble Behavior**:
- Appears above agent for 4 seconds then fades
- Max 3 bubbles visible at once
- Color-coded by agent
- Emotion affects bubble style (e.g., hearts for happy)

```typescript
// Proposed: apps/web/src/game/ui/ChatBubble.ts
class ChatBubble extends PIXI.Container {
  constructor(text: string, agentColor: number, emotion?: string) {
    // Rounded rectangle background
    // Text with word wrap
    // Pointer triangle toward agent
    // Auto-fade after 4s
  }
}
```

---

## Dialogue Triggers (When Agents Talk)

| Trigger | Topic | Frequency |
|---------|-------|-----------|
| **Morning start** | "greeting" | Once per session |
| **Task complete** | "task_update" | On run.completed |
| **Task fail** | "task_update" | On run.failed |
| **Idle timer** | "idle_chat" | Every 60s if idle |
| **Agent enters room** | "greeting" | On agent spawn/move |
| **User command** | "react" | After "talk to X" command |

---

## Implementation Slices

| Slice | Description | Files |
|-------|-------------|-------|
| S1 | Dialogue types + personas | dialogue.types.ts, personas.ts |
| S2 | DialogueGateway (Socket.io) | dialogue.gateway.ts |
| S3 | DialogueService (LLM integration) | dialogue.service.ts |
| S4 | DialogueModule wiring | dialogue.module.ts, api.module.ts |
| S5 | useDialogueSocket hook | hooks/useDialogueSocket.ts |
| S6 | ChatBubble UI component | game/ui/ChatBubble.ts |
| S7 | Wire into LoungeCanvas | LoungeCanvas.tsx |
| S8 | Tests | dialogue.gateway.test.ts, useDialogueSocket.test.ts |

---

## Budget

| Item | Max |
|------|-----|
| New files | 8 |
| Modified files | 2 (LoungeCanvas.tsx, api.module.ts) |
| New dependencies | 0 (reuse existing socket.io, LLM client) |
| Requires C-OFFICE-MOVEMENT-001? | No (independent) |
| PixiJS version change | None |
| Spine change | None |
