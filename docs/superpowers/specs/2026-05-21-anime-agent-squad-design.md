# Anime Agent Squad — Design Spec
_Date: 2026-05-21_

---

## 1. Overview

ระบบ Multi-agent AI ที่ตัวละคร anime 7 ตัวทำงานเป็น coding agents โดยแต่ละตัวมี personality, role, และ animation ของตัวเอง ตัวละครแสดงอารมณ์แบบ real-time ตาม agent state และ streaming output จาก Claude API

**Tech stack:** Next.js 15 · Nest.js · Tailwind CSS · anime.js · Socket.io · PostgreSQL · Prisma · Claude API (claude-sonnet-4-6)

---

## 2. Pages

### 2.1 Lounge (หน้าแรก)
ห้องอนิเมะ isometric view — ตัวละครทุกตัวอยู่ในห้องพร้อมกัน

- **Camera angle:** cavalier axonometric (back wall = flat rectangle, left wall = parallelogram 45°)
- **Time-based theme:** อ่านเวลาจริงของ client และเปลี่ยน sky/wall/floor/lighting อัตโนมัติ
  - 🌙 กลางคืน (20:00–05:00): dark purple, moon, stars
  - 🌅 เช้าตรู่ (05:00–07:30): pink/red dawn, warm tones
  - 🌤️ เช้า (07:30–12:00): blue sky, bright room
  - ☀️ บ่าย (12:00–17:00): bright blue, full daylight
  - 🌆 พระอาทิตย์ตก (17:00–20:00): orange/red sunset
- **ตัวละคร:** circular portrait วางในห้องตามตำแหน่งบทบาท, hover = tooltip, คลิก = เปิด Stage
- **Animation:** float loop ตลอดเวลา, ความเร็วและ glow ตาม agent state (working/idle/sleeping)
- **Rendered:** HTML Canvas (JavaScript isometric projection)

### 2.2 Stages
Character sidebar ซ้าย + conversation tabs ขวา

- **Sidebar:** แสดงตัวละครทุกตัว พร้อม emotion image, status dot, emotion tag
- **Chat area:** conversation ของตัวละครที่เลือก, streaming text, thinking dots เมื่อ AI กำลัง respond
- **Tabs:** แต่ละ character มี conversation history ของตัวเอง
- **Character header:** แสดงตัวละคร active + current emotion + status

### 2.3 Projects
สร้างและจัดการ orchestration tasks

- สร้าง Project พร้อม context + todo checklist
- เลือก Lead character (coordinator)
- Lead วิเคราะห์ todos → spawn Members สูงสุด 9 ตัว
- ดู progress ของแต่ละ member และ relay messages ระหว่าง characters

---

## 3. Naming Convention (Idol/Pop Theme)

| Concept (reference repo) | ชื่อใหม่ | หมายเหตุ |
|--------------------------|----------|----------|
| Tentacle (job context) | **Project** | มี title, context, todos |
| Terminal/Session | **Stage** | Claude API conversation |
| Worker (child agent) | **Member** | spawn จาก todo item |
| Parent coordinator | **Lead** | วิเคราะห์และ delegate |
| Channel message | **Relay** | inject เข้า idle Stage |
| `.octogent/` | `.studio/` | local state folder |
| AgentStateTracker | **StageTracker** | ported from reference repo |
| resolveCharacterEmotion | **readCharacterMood** | ported + extended |
| CHARACTER_EMOTION_CATALOG | **CHARACTER_MOOD_REGISTRY** | ported + extended |
| Idle tier: fresh/lingering/deep | **ready/resting/offline** | 0–30s / 30–90s / 90s+ |

---

## 4. Characters

| ID | Name | Role | System Prompt Style | Unique Emotions |
|----|------|------|---------------------|-----------------|
| mai | Mai | Frontend Sorcerer | energetic, UI-focused | idle, victory, crying, thinking, happy, angry, sleepy, excited, surprised |
| ren | Ren | Backend Samurai | calm, precise, data-first | idle, victory, crying, thinking, happy, angry, sleepy, excited, surprised |
| yui | Yui | Code Reviewer | careful, risk-aware | idle, victory, crying, thinking, happy, angry, sleepy, excited, surprised |
| aki | Aki | DevOps Mechanic | evidence-based, log-reader | idle, victory, crying, thinking, happy, angry, sleepy, excited, surprised |
| mika | Mika | UI Designer | visual, accessibility-first | idle, victory, crying, thinking, happy, angry, sleepy, excited, surprised |
| senko | Senko | Support Fox | warm, helpful | happy, thinking, angry, crying, love, idle, sleepy, excited, surprised |
| shinobu | Shinobu | Strategist | clever, tactical | thinking, happy, excited, angry, crying, done, sleepy, snack, listening |

Each character gets their system prompt prepended to every Stage conversation.

---

## 5. Emotion System (ported from reference repo)

### 5.1 StageTracker (ported from AgentStateTracker)
```typescript
type StageRuntimeState = 'processing' | 'idle';
```
- ตรวจ processing/idle จาก Claude API streaming chunks
- `idle_deadline`: หลัง chunk สุดท้าย + 1.6s → เปลี่ยนเป็น `idle`

### 5.2 Idle Tier
| Tier | เงื่อนไข | Emotion |
|------|----------|---------|
| ready | 0–30s หลัง idle | mood ปกติ |
| resting | 30–90s | sleepy |
| offline | 90s+ | sleepy (animation ช้าลง) |

### 5.3 readCharacterMood() (ported from resolveCharacterEmotion)
Maps `stageState + idleTier` → `CharacterMood` per character

```typescript
type LogicalMoodState =
  | 'live' | 'waiting_for_user' | 'blocked'
  | 'exited_success' | 'exited_failure'
  | 'idle_ready' | 'idle_resting' | 'idle_offline';
```

### 5.4 Emotion Override
Claude สามารถใส่ `[emotion:excited]` ใน response → override mood ชั่วคราว 3s แล้วกลับ resolved mood

---

## 6. Architecture

```
Next.js (frontend)
  ↕ Socket.io (emotion events, message chunks)
  ↕ REST HTTP (CRUD)
Nest.js (backend)
  → Claude API (claude-sonnet-4-6, streaming)
  → PostgreSQL (Prisma ORM)

packages/core (shared)
  - CHARACTER_MOOD_REGISTRY
  - readCharacterMood()
  - StageTracker
  - TypeScript types
```

### 6.1 Monorepo Structure
```
anime-agent-squad/
├── apps/
│   ├── web/          # Next.js 15
│   └── api/          # Nest.js
├── packages/
│   └── core/         # shared types + character logic
└── characters/       # → apps/web/public/characters/
```

---

## 7. Socket.io Event Protocol

| Direction | Event | Payload |
|-----------|-------|---------|
| C→S | `join_stage` | `{ stageId }` |
| C→S | `send_message` | `{ stageId, content }` |
| S→C | `stage_state` | `{ characterId, state: 'processing'\|'idle', idleTier? }` |
| S→C | `message_chunk` | `{ stageId, chunk, messageId }` |
| S→C | `message_done` | `{ stageId, messageId, fullContent, mood? }` |
| S→C | `mood_override` | `{ characterId, mood }` |

### 7.1 Data Flow (ส่ง 1 message)
1. User emit `send_message` → Nest.js บันทึก user message → PostgreSQL
2. emit `stage_state: processing` → frontend แสดง thinking mood + anime.js burst
3. Nest.js เรียก Claude API พร้อม system prompt + history → stream เริ่ม
4. แต่ละ chunk → emit `message_chunk` → frontend append text
5. ถ้าเจอ `[emotion:X]` → emit `mood_override` → burst animation
6. Stream จบ → บันทึก assistant message → emit `message_done` + `stage_state: idle`
7. StageTracker นับ idle tier: 30s=resting, 90s=offline → mood เปลี่ยนเอง

---

## 8. Database Schema (Prisma + PostgreSQL)

```prisma
// Free chat (Stages page) — 1 conversation per character
model Conversation {
  id          String    @id @default(cuid())
  characterId String    @unique
  title       String?
  createdAt   DateTime  @default(now())
  messages    Message[]
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  role           String       // 'user' | 'assistant'
  content        String
  mood           String?
  createdAt      DateTime     @default(now())
}

model Project {
  id                  String     @id @default(cuid())
  title               String
  context             String     // markdown briefing
  leadCharacterId     String
  status              String     @default("active")
  createdAt           DateTime   @default(now())
  todos               TodoItem[]
  stages              ProjectStage[]
}

model TodoItem {
  id                String    @id @default(cuid())
  projectId         String
  project           Project   @relation(fields: [projectId], references: [id])
  text              String
  status            String    @default("pending") // pending|active|done
  assignedCharId    String?
  memberStageId     String?
  position          Int
}

model ProjectStage {
  id              String    @id @default(cuid())
  projectId       String
  project         Project   @relation(fields: [projectId], references: [id])
  characterId     String
  parentStageId   String?
  role            String    // 'lead' | 'member'
  state           String    @default("idle")
  createdAt       DateTime  @default(now())
  relays          Relay[]
  messages        StageMessage[]
}

model StageMessage {
  id           String       @id @default(cuid())
  stageId      String
  stage        ProjectStage @relation(fields: [stageId], references: [id])
  role         String
  content      String
  mood         String?
  createdAt    DateTime     @default(now())
}

model Relay {
  id           String       @id @default(cuid())
  fromStageId  String
  toStageId    String
  toStage      ProjectStage @relation(fields: [toStageId], references: [id])
  content      String
  delivered    Boolean      @default(false)
  createdAt    DateTime     @default(now())
}
```

---

## 9. Animation System (anime.js)

แต่ละ mood มี 2 animations:
1. **Loop** — เล่นตลอดเวลา (ใช้ anime.js timeline with loop)
2. **Burst** — เล่นเมื่อ mood เปลี่ยน (entrance animation)

| Mood | Loop | Burst |
|------|------|-------|
| idle | float -6px 3s | fade-in up |
| thinking | tilt ±3° 2.5s | fade-in |
| victory | bounce -16px 0.8s | pop scale 1.2 + rotate 5° |
| crying | droop +4px 4s | shake X |
| excited | fast bounce 0.6s | jump -20px + glow |
| angry | subtle shake 1s | shake X ±5px |
| sleepy (resting) | slow sway ±2° 5s | slow sink |
| sleepy (offline) | very slow sway 7s | yawn scale 0.95 |
| surprised | pop loop | scale 1.3 rapid |
| happy | bounce -10px 1.2s | spring up |

---

## 10. Orchestration (ported from reference repo)

### 10.1 Flow
1. User สร้าง Project + context + todos
2. User เลือก Lead character
3. Lead วิเคราะห์ todos → tool call `spawn_member` พร้อม character + task
4. Nest.js สร้าง ProjectStage สำหรับแต่ละ Member (สูงสุด 9)
5. Members ทำงานพร้อมกัน, ส่ง Relay messages เมื่อต้องการ coordinate
6. Relay ถูก inject เข้า idle Member ในรูป `[Relay from X]: ...`
7. Lead review ผลลัพธ์และ update todo status

### 10.2 Limits (ported)
- สูงสุด **9 Members per Lead** (เหมือน reference repo)
- Relay ส่งได้เฉพาะ **idle Stage** เท่านั้น
- Character system prompt **prepend ทุก Stage** ทุกครั้ง

---

## 11. Out of Scope (v1)

- Worktree isolation (git branch per member)
- File system context (`.studio/tentacles/`) — ใช้ DB แทน
- PTY sessions / actual `claude` CLI integration
- Real-time collaboration (multiple users)
- Audio feedback
