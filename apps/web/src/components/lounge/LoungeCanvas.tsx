'use client';
import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import * as PIXI from 'pixi.js';
import 'pixi-spine';
import { Spine } from 'pixi-spine';
import {
  drawBackground,
  proj,
  DEFAULT_OBJECTS,
  CANVAS_W,
  CANVAS_H,
  ROOM_TILES_X,
  ROOM_TILES_Y,
  setRoomProjection,
  resolveRoomTheme,
  ROOM_THEME_KEYS,
} from './pixiRoom';
import type { RoomTheme, RoomThemeKey } from './pixiRoom';
import { drawThemeParticles } from './themeParticles';
import { buildRoomScene, loadRoomJSON, loadTiledMap, isValidTiledJson } from './roomLoader';
import type { RoomScene } from './roomLoader';
import type { RoomObject } from './roomDefs';
import { checkCollision, FURNITURE_TILES } from './roomDefs';
import { FurnitureInspector } from './FurnitureInspector';
import { ShopModal } from './ShopModal';
import { SupplyPanel } from './SupplyPanel';
import { TiledMapImporter } from './TiledMapImporter';
import { AgentBubble } from './AgentBubble';
import { getDefaultSpawnPosition, type CatalogItem } from './furnitureCatalog';
import {
  AFFECTION_MAX,
  FOOD_CAP,
  HEADPAT_AFFECTION,
  MORALE_EMOJI,
  applyHeadpat,
  applyTaskMorale,
  applyTrainingXp,
  computeComfort,
  createDormState,
  feedDorm,
  foodDepletionSeconds,
  moraleBand,
  reviveDormState,
  tickDorm,
  type DormState,
  type FoodItem,
} from '@/game/dorm/dormEngine';
import { selectPurchasePlacement } from './purchasePlacement';
import {
  createInitialSpineLoadStatus,
  getAgentOverlayLayout,
  getMoodFloatConfig,
  hasOfficeAgentSpineAsset,
  OFFICE_AGENT_SPINE_ASSETS,
  OFFICE_AGENT_SPINE_ASSET_BY_ID,
  shouldShowHtmlAgentAvatar,
  type SpineAgentAsset,
  type SpineLoadStatus,
} from './spineAgents';
import { useAgentWalk } from '@/hooks/useAgentWalk';
import { useAgentSocket } from '@/hooks/useAgentSocket';
import { useLoungePersistence } from '@/hooks/useLoungePersistence';
import { useDormTickLoop } from '@/hooks/useDormTickLoop';
import { useFurnitureDrag } from '@/hooks/useFurnitureDrag';
import { useDialogueScheduler } from '@/hooks/useDialogueScheduler';
import type { AgentLoungeState, AgentLoungeTaskType } from '@squad/core';
import type { Agent, AgentState, AgentTaskType } from '@/game/agents/agentTypes';
import {
  createOfficeToolEvent,
  createOfficeWorkflowSteps,
  planWorkflowSteps,
  convertLLMSteps,
  describeOfficeStepDone,
  describeOfficeStepStart,
  OFFICE_TOOL_BOUNDARIES,
  OFFICE_WORKFLOW_AGENTS,
} from '@/game/agents/officeWorkflow';
import type {
  OfficeAgentId,
  OfficeChatMessage,
  OfficeToolEvent,
  OfficeWorkflowStatus,
  OfficeWorkflowStep,
} from '@/game/agents/officeWorkflow';
import { startOfficeRun, completeOfficeRun } from '@/game/agents/officeRunAdapter';
import { useRunSocket } from '@/hooks/useRunSocket';
import { loungeStations, type LoungeStationId, resolveLoungeStation } from '@/game/scene/loungeStations';
import { buildLoungeRouteGrid } from '@/game/scene/loungePathGrid';
import Image from 'next/image';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ── Autonomous orchestration command pool ────────────────────────────────────
const AUTONOMOUS_COMMANDS = [
  'Review the latest lounge rendering performance',
  'Audit agent pathfinding edge cases near furniture',
  'Document the Spine animation pipeline',
  'Optimize dialogue scheduler memory usage',
  'Refactor dorm engine food drain constants',
  'Add TypeScript strict checks to core package',
  'Plan mobile-responsive lounge layout',
  'Verify theme particle system across all time periods',
  'Patch the office workflow step handoff logic',
  'Audit token economy balance across dorm actions',
] as const;

const AUTONOMOUS_COOLDOWN_MS = 8_000;
const AUTONOMOUS_LEAD_ID = 'agent-1'; // Mai
/** Returns false once the autonomous cycle that started a run has been cancelled. */
type RunGuard = () => boolean;

function snapObj(o: RoomObject, maxX = ROOM_TILES_X, maxY = ROOM_TILES_Y): RoomObject {
  return {
    ...o,
    wx: Math.round(Math.max(0, Math.min(maxX - 1, o.wx))),
    wy: Math.min(maxY, Math.round(Math.max(0, o.wy))),
  };
}

function cloneLayout(objects: RoomObject[]): RoomObject[] {
  return objects.map((o) => ({ ...o }));
}

function autoArrangeLayout(objects: RoomObject[], maxW: number, maxH: number): RoomObject[] | null {
  const sorted = [...objects].sort((a, b) => {
    const ta = FURNITURE_TILES[a.furnitureType] ?? { w: 1, d: 1 };
    const tb = FURNITURE_TILES[b.furnitureType] ?? { w: 1, d: 1 };
    return tb.w * tb.d - ta.w * ta.d;
  });

  const placed: RoomObject[] = [];
  const positions = new Map<number, { wx: number; wy: number }>();

  for (const current of sorted) {
    const fp = FURNITURE_TILES[current.furnitureType] ?? { w: 1, d: 1 };
    const maxX = Math.max(0, maxW - fp.w);
    const maxY = Math.max(0, maxH - fp.d);
    let found = false;

    for (let y = 0; y <= maxY && !found; y++) {
      for (let x = 0; x <= maxX; x++) {
        const candidate = { ...current, wx: x, wy: y };
        if (!checkCollision([...placed, candidate], candidate.id, x, y)) {
          placed.push(candidate);
          positions.set(current.id, { wx: x, wy: y });
          found = true;
          break;
        }
      }
    }

    if (!found) return null;
  }

  return objects.map((obj) => {
    const pos = positions.get(obj.id);
    if (!pos) return { ...obj };
    return { ...obj, wx: pos.wx, wy: pos.wy };
  });
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TASK_DEFS: { task: AgentTaskType; icon: string; label: string }[] = [
  { task: 'code', icon: '💻', label: 'Code' },
  { task: 'research', icon: '📚', label: 'Read' },
  { task: 'meeting', icon: '🗣️', label: 'Meet' },
  { task: 'document', icon: '📝', label: 'Doc' },
  { task: 'print', icon: '🖨️', label: 'Print' },
  { task: 'rest', icon: '🛋️', label: 'Rest' },
];

const TASK_ICON: Record<AgentTaskType, string> = {
  code: '💻',
  research: '📚',
  meeting: '🗣️',
  document: '📝',
  review: '🔍',
  print: '🖨️',
  rest: '🛋️',
  idle: '·',
};

const TASK_ICON_LABEL: Record<AgentTaskType, string> = {
  code: 'Code',
  research: 'Read',
  meeting: 'Meet',
  document: 'Doc',
  review: 'Review',
  print: 'Print',
  rest: 'Rest',
  idle: 'Idle',
};

const TASK_REWARDS: Record<AgentTaskType, { coins: number; happiness: number }> = {
  code: { coins: 40, happiness: 8 },
  research: { coins: 25, happiness: 5 },
  document: { coins: 20, happiness: 4 },
  meeting: { coins: 20, happiness: 4 },
  review: { coins: 30, happiness: 6 },
  print: { coins: 15, happiness: 3 },
  rest: { coins: 10, happiness: 10 },
  idle: { coins: 0, happiness: 0 },
};

const STATE_LABEL: Record<string, string> = {
  idle: '😴 Idle',
  walking: '🚶 Moving',
  thinking: '🤔 Thinking',
  coding: '💻 Coding',
  researching: '📚 Reading',
  meeting: '🗣️ Meeting',
  documenting: '📝 Docs',
  reviewing: '🔍 Review',
  printing: '🖨️ Print',
  resting: '🛋️ Resting',
  done: '✅ Done',
  error: '⚠️ Error',
};

const STATE_COLOR: Record<string, string> = {
  idle: 'bg-[#86efac]/30 text-[#166534]',
  walking: 'bg-[#93c5fd]/30 text-[#1e40af]',
  thinking: 'bg-[#c4b5fd]/30 text-[#5b21b6]',
  coding: 'bg-[#fde68a]/40 text-[#7a5000]',
  researching: 'bg-[#a5f3fc]/30 text-[#155e75]',
  meeting: 'bg-[#f9a8d4]/30 text-[#831843]',
  documenting: 'bg-[#d9f99d]/30 text-[#3f6212]',
  reviewing: 'bg-[#fca5a5]/30 text-[#7f1d1d]',
  printing: 'bg-[#e9d5ff]/30 text-[#4c1d95]',
  resting: 'bg-[#fed7aa]/30 text-[#7c2d12]',
  done: 'bg-[#86efac]/40 text-[#14532d]',
  error: 'bg-[#fca5a5]/50 text-[#991b1b]',
};

const OFFICE_STATUS_LABEL: Record<OfficeWorkflowStatus, string> = {
  idle: 'Idle',
  running: 'Running',
  paused: 'Paused',
  done: 'Done',
};

const OFFICE_STATUS_CLASS: Record<OfficeWorkflowStatus, string> = {
  idle: 'bg-[#e8d0a0]/50 text-[#5a3c18]',
  running: 'bg-[#bbf7d0]/80 text-[#166534]',
  paused: 'bg-[#fde68a]/90 text-[#7a5000]',
  done: 'bg-[#bfdbfe]/90 text-[#1e40af]',
};

const OFFICE_CHAT_CLASS: Record<OfficeChatMessage['kind'], string> = {
  status: 'border-[#c8a870]/60 bg-[#fff8e8]/80 text-[#5a3c18]',
  handoff: 'border-[#93c5fd]/60 bg-[#eff6ff]/85 text-[#1e3a8a]',
  done: 'border-[#86efac]/70 bg-[#f0fdf4]/85 text-[#166534]',
  blocked: 'border-[#fca5a5]/80 bg-[#fef2f2]/90 text-[#991b1b]',
  dialogue: 'border-[#c4b5fd]/60 bg-[#f5f3ff]/85 text-[#5b21b6]',
};

/** Canonical seed task ID for REST adapter (fire-and-forget, degrade silently). */
const OFFICE_CANONICAL_TASK_ID = 't-008'; // "File findings in backlog" (status: todo)

const ENABLE_LLM_DIALOGUE = process.env.NEXT_PUBLIC_ENABLE_LLM_DIALOGUE === 'true';

const STORAGE_KEY = 'squad:lounge:v8';
const LEGACY_STORAGE_KEY = 'squad:lounge:v7';
const ROOM_MAP_URL = '/maps/maple_hideout.json';
const INITIAL_COINS = 500;
const INITIAL_TOKENS = 20;
const TASK_DONE_TOKENS = 1;
const TRAIN_REWARD = 25;
const TRAIN_MAX = 4;
const TRAIN_XP = 60;
const TRAIN_TOKENS = 2;
const WORKFLOW_DONE_TOKENS = 3;
const TRAIN_DATE_KEY = 'squad:lounge:trainDate';
const TRAIN_COUNT_KEY = 'squad:lounge:trainCount';
const HAPPINESS_MAX = 200;
/** Dorm simulation tick cadence while the page is open. */
const DORM_TICK_MS = 10_000;
/** Cadence for picking a new idle wanderer. */
const WANDER_INTERVAL_MS = 9_000;
const DORM_AGENT_IDS = OFFICE_WORKFLOW_AGENTS.map((spec) => spec.id);

function getLocalDateKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
const FOOD_LOW_THRESHOLD_PCT = 20;
const FOOD_LOW_REWARD_MULT = 0.75;

function formatSecondsHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${ss}`;
}

/** Starter rest-floor layout used the first time the player visits floor 2. */
const DEFAULT_FLOOR2_TEMPLATE: Omit<RoomObject, 'id'>[] = [
  {
    furnitureType: 'low_table',
    label: 'Tea Table',
    description: 'A low Japanese tea table',
    wx: 3,
    wy: 3,
    wz: 0,
    happiness: 8,
    draggable: true,
  },
  {
    furnitureType: 'zabuton',
    label: 'Floor Cushion',
    description: 'A soft zabuton floor cushion',
    wx: 3,
    wy: 5,
    wz: 0,
    happiness: 4,
    draggable: true,
  },
  {
    furnitureType: 'plant',
    label: 'Tropical Plant',
    description: 'A lush plant in a terracotta pot',
    wx: 0,
    wy: 0,
    wz: 0,
    happiness: 7,
    draggable: true,
  },
  {
    furnitureType: 'bookcase',
    label: 'Bookcase',
    description: 'A tall bookcase packed with colorful books',
    wx: 6,
    wy: 0,
    wz: 0,
    happiness: 10,
    draggable: true,
  },
];

type Mode = 'visit' | 'move';

type OfficeWalker = {
  agent: Agent;
  assignTask: (task: AgentTaskType) => void;
  clearAgentTask: () => void;
  walkToIso: (target: { wx: number; wy: number; wz: number }) => boolean;
};

type OfficeWalkerMap = Record<OfficeAgentId, OfficeWalker>;

type SharedLayoutPayload = {
  v: 1;
  roomName: string;
  roomW: number;
  roomH: number;
  happiness: number;
  coins: number;
  floor: number;
  objects: RoomObject[];
};

const LAYOUT_QUERY_PARAM = 'layout';

type AgentVisualState = {
  position: { x: number; y: number };
  direction: Agent['direction'];
};

type SpineAgentDisplay = PIXI.Container & {
  spine: Spine;
};

function normalizeSpineFootAnchor(spine: Spine): void {
  const bounds = spine.getLocalBounds();
  if (bounds.width <= 0 || bounds.height <= 0) return;
  spine.x = -(bounds.x + bounds.width / 2);
  spine.y = -(bounds.y + bounds.height);
}

function positionSpineAgent(
  display: SpineAgentDisplay,
  visual: AgentVisualState,
  asset: Pick<SpineAgentAsset, 'scale'>,
): void {
  display.x = visual.position.x;
  display.y = visual.position.y;
  display.scale.x = visual.direction === 'left' ? -asset.scale : asset.scale;
  display.scale.y = asset.scale;
  display.zIndex = visual.position.y + 12;
}

function encodeBase64Url(input: string): string {
  if (typeof window === 'undefined') return '';
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(input: string): string | null {
  if (typeof window === 'undefined') return null;
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function parseSharedLayoutFromUrl(): SharedLayoutPayload | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get(LAYOUT_QUERY_PARAM);
  if (!encoded) return null;

  const decoded = decodeBase64Url(encoded);
  if (!decoded) return null;

  try {
    const parsed = JSON.parse(decoded) as Partial<SharedLayoutPayload>;
    if (parsed.v !== 1 || !Array.isArray(parsed.objects)) return null;

    const roomW =
      typeof parsed.roomW === 'number' ? Math.max(6, Math.min(16, parsed.roomW)) : ROOM_TILES_X;
    const roomH =
      typeof parsed.roomH === 'number' ? Math.max(5, Math.min(14, parsed.roomH)) : ROOM_TILES_Y;

    const objects = parsed.objects
      .filter((o): o is RoomObject => {
        return (
          typeof o?.id === 'number' &&
          typeof o?.furnitureType === 'string' &&
          typeof o?.label === 'string' &&
          typeof o?.description === 'string' &&
          typeof o?.wx === 'number' &&
          typeof o?.wy === 'number' &&
          typeof o?.wz === 'number' &&
          typeof o?.happiness === 'number' &&
          typeof o?.draggable === 'boolean'
        );
      })
      .map((o) => snapObj(o, roomW, roomH));

    if (objects.length === 0) return null;

    return {
      v: 1,
      roomName:
        typeof parsed.roomName === 'string' && parsed.roomName.trim().length > 0
          ? parsed.roomName
          : 'Shared Lounge',
      roomW,
      roomH,
      happiness: typeof parsed.happiness === 'number' ? parsed.happiness : 128,
      coins: typeof parsed.coins === 'number' ? Math.max(0, parsed.coins) : INITIAL_COINS,
      floor: parsed.floor === 2 ? 2 : 1,
      objects,
    };
  } catch {
    return null;
  }
}

function removeSharedLayoutQuery(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(LAYOUT_QUERY_PARAM)) return;
  url.searchParams.delete(LAYOUT_QUERY_PARAM);
  const qs = url.searchParams.toString();
  const next = `${url.pathname}${qs ? `?${qs}` : ''}${url.hash}`;
  window.history.replaceState({}, '', next);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LoungeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const sceneRef = useRef<RoomScene | null>(null);
  const charSpritesRef = useRef<Map<OfficeAgentId, SpineAgentDisplay>>(new Map());
  const agentVisualStateRef = useRef<Partial<Record<OfficeAgentId, AgentVisualState>>>({});
  const lastCooldownToastRef = useRef(0);
  const dormRef = useRef<DormState | null>(null);
  const comfortRef = useRef(0);
  const trainStorageLoadedRef = useRef(false);
  const happinessMaxReachedRef = useRef(false);
  const objectsRef = useRef<RoomObject[]>(DEFAULT_OBJECTS);
  const historyRef = useRef<RoomObject[][]>([]);
  const redoRef = useRef<RoomObject[][]>([]);
  const nextIdRef = useRef<number>(1000);
  const scaleRef = useRef<number>(1);
  const modeRef = useRef<Mode>('visit');

  const router = useRouter();
  const [mode, setMode] = useState<Mode>('visit');
  const [objects, setObjects] = useState<RoomObject[]>(DEFAULT_OBJECTS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [cameraY, setCameraY] = useState(20);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [roomName, setRoomName] = useState('Maple Hideout');
  const [happiness, setHappiness] = useState(128);
  const [coins, setCoins] = useState(INITIAL_COINS);
  const [floor, setFloor] = useState(1);
  const [trainCount, setTrainCount] = useState(0);
  const [agentBubble, setAgentBubble] = useState<string | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<
    { id: number; x: number; y: number; createdAt: number }[]
  >([]);
  const heartIdRef = useRef(0);
  const [shopOpen, setShopOpen] = useState(false);
  const [supplyOpen, setSupplyOpen] = useState(false);
  // ── Dorm simulation state (Azur Lane style) ────────────────────────────────
  const [dorm, setDorm] = useState<DormState>(() => createDormState(DORM_AGENT_IDS, Date.now()));
  const [tokens, setTokens] = useState(INITIAL_TOKENS);
  const tokensRef = useRef(INITIAL_TOKENS);
  // Furniture layout of the floor currently NOT shown (each floor keeps its own layout).
  const [inactiveFloorObjects, setInactiveFloorObjects] = useState<RoomObject[]>([]);
  const [themeKey, setThemeKey] = useState<'auto' | RoomThemeKey>('auto');
  const theme = useMemo<RoomTheme>(() => resolveRoomTheme(themeKey), [themeKey]);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [roomReady, setRoomReady] = useState(false);
  const [roomW, setRoomW] = useState(ROOM_TILES_X);
  const [roomH, setRoomH] = useState(ROOM_TILES_Y);
  const [spineLoadStatus, setSpineLoadStatus] = useState<Record<OfficeAgentId, SpineLoadStatus>>(
    () => createInitialSpineLoadStatus(),
  );
  const spinesReady = useMemo(
    () => Object.values(spineLoadStatus).every((s) => s === 'loaded'),
    [spineLoadStatus],
  );
  const roomWRef = useRef(ROOM_TILES_X);
  const roomHRef = useRef(ROOM_TILES_Y);
  const coinsRef = useRef(INITIAL_COINS);
  const maiSpineAsset = OFFICE_AGENT_SPINE_ASSET_BY_ID['agent-1'];
  const routeGrid = useMemo(() => buildLoungeRouteGrid(objects, roomW, roomH), [
    objects,
    roomW,
    roomH,
  ]);
  const { agent, assignTask, walkToIso, clearAgentTask, enqueueTask, clearQueue, routeDebug } =
    useAgentWalk({
      roomObjects: objects,
      routeGrid,
      roomWidth: roomW,
      roomHeight: roomH,
      startIso: maiSpineAsset.fallbackIso,
    });
  const previousAgentStateRef = useRef(agent.state);
  const previousTaskTypeRef = useRef(agent.taskType);
  // Second agent — autopilot demo. Cycles through tasks deterministically when
  // idle so the multi-agent foundation is visible without extra HUD chrome.
  const aki = useAgentWalk({
    roomObjects: objects,
    routeGrid,
    roomWidth: roomW,
    roomHeight: roomH,
    agentId: 'agent-2',
    agentName: 'Aki',
    characterId: 'aki',
    startIso: OFFICE_AGENT_SPINE_ASSET_BY_ID['agent-2'].fallbackIso,
  });
  const ren = useAgentWalk({
    roomObjects: objects,
    routeGrid,
    roomWidth: roomW,
    roomHeight: roomH,
    agentId: 'agent-3',
    agentName: 'Ren',
    characterId: 'ren',
    startIso: OFFICE_AGENT_SPINE_ASSET_BY_ID['agent-3'].fallbackIso,
  });
  const yui = useAgentWalk({
    roomObjects: objects,
    routeGrid,
    roomWidth: roomW,
    roomHeight: roomH,
    agentId: 'agent-4',
    agentName: 'Yui',
    characterId: 'yui',
    startIso: OFFICE_AGENT_SPINE_ASSET_BY_ID['agent-4'].fallbackIso,
  });
  const mika = useAgentWalk({
    roomObjects: objects,
    routeGrid,
    roomWidth: roomW,
    roomHeight: roomH,
    agentId: 'agent-5',
    agentName: 'Mika',
    characterId: 'mika',
    startIso: OFFICE_AGENT_SPINE_ASSET_BY_ID['agent-5'].fallbackIso,
  });
  // ── Agent event socket — emit state/task events to /lounge namespace ──────
  const agentSocket = useAgentSocket({ enabled: true });
  const agentPrevStatesRef = useRef<Record<string, AgentState>>({});

  useEffect(() => {
    const walkers = [
      { id: 'agent-1', characterId: 'mai', agent },
      { id: 'agent-2', characterId: 'aki', agent: aki.agent },
      { id: 'agent-3', characterId: 'ren', agent: ren.agent },
      { id: 'agent-4', characterId: 'yui', agent: yui.agent },
      { id: 'agent-5', characterId: 'mika', agent: mika.agent },
    ];

    const workingStates: AgentState[] = [
      'walking', 'thinking', 'coding', 'researching',
      'meeting', 'documenting', 'reviewing', 'printing',
    ];

    for (const w of walkers) {
      const prev = agentPrevStatesRef.current[w.id];
      const cur = w.agent.state;
      if (!prev || prev === cur) {
        agentPrevStatesRef.current[w.id] = cur;
        continue;
      }

      // ── State changed ────────────────────────────────────────────────
      agentSocket.emitStateChanged({
        agentId: w.id,
        characterId: w.characterId,
        event: 'agent.state.changed',
        state: cur as AgentLoungeState,
        previousState: prev as AgentLoungeState,
      });

      // ── Task assigned: idle → working ────────────────────────────────
      if (prev === 'idle' && workingStates.includes(cur) && w.agent.taskType) {
        agentSocket.emitTaskAssigned({
          agentId: w.id,
          characterId: w.characterId,
          event: 'agent.task.assigned',
          taskType: w.agent.taskType as AgentLoungeTaskType,
          targetStationId: w.agent.targetStationId,
        });
      }

      // ── Task completed: working → idle/done ───────────────────────────
      if (workingStates.includes(prev) && (cur === 'idle' || cur === 'done')) {
        agentSocket.emitTaskCompleted({
          agentId: w.id,
          characterId: w.characterId,
          event: 'agent.task.completed',
          taskType: (w.agent.taskType || 'idle') as AgentLoungeTaskType,
          durationMs: w.agent.workDurationMs,
        });
      }

      // ── Error ─────────────────────────────────────────────────────────
      if (cur === 'error') {
        agentSocket.emitError({
          agentId: w.id,
          characterId: w.characterId,
          event: 'agent.error',
          error: `Agent entered error state from ${prev}`,
          taskType: w.agent.taskType as AgentLoungeTaskType | undefined,
        });
      }

      agentPrevStatesRef.current[w.id] = cur;
    }
  }, [agent.state, aki.agent.state, ren.agent.state, yui.agent.state, mika.agent.state, agentSocket]);

  const [officeCommand, setOfficeCommand] = useState('Build a verified lounge workflow slice');
  // Off by default: every autonomous cycle calls the LLM workflow planner.
  const [autonomousMode, setAutonomousMode] = useState(false);
  // Read by timers that outlive a render, so switching off takes effect immediately.
  const autonomousModeRef = useRef(false);
  // Bumped to cancel any pending autonomous cycle (toggle, manual run, reset, unmount).
  const autonomousCycleRef = useRef(0);
  // In-flight planner request of the current autonomous run, aborted when its cycle is cancelled.
  const plannerAbortRef = useRef<AbortController | null>(null);
  const cancelAutonomousCycle = useCallback(() => {
    autonomousCycleRef.current += 1;
    plannerAbortRef.current?.abort();
    plannerAbortRef.current = null;
  }, []);
  const autonomousTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeOfficeCommand, setActiveOfficeCommand] = useState(
    'Build a verified lounge workflow slice',
  );
  const [officeStatus, setOfficeStatus] = useState<OfficeWorkflowStatus>('idle');
  const [officeSteps, setOfficeSteps] = useState<OfficeWorkflowStep[]>(() =>
    planWorkflowSteps('Build a verified lounge workflow slice'),
  );
  const [officeStepIndex, setOfficeStepIndex] = useState(0);
  const [officeChat, setOfficeChat] = useState<OfficeChatMessage[]>([]);
  const [officeToolEvents, setOfficeToolEvents] = useState<OfficeToolEvent[]>([]);
  const officeStepInFlightRef = useRef<string | null>(null);
  const officeInFlightRunIdRef = useRef<string | null>(null);
  const officeChatIdRef = useRef(0);
  const officeToolEventIdRef = useRef(0);
  const officeWalkers = useMemo<OfficeWalkerMap>(
    () => ({
      'agent-1': { agent, assignTask, clearAgentTask, walkToIso },
      'agent-2': {
        agent: aki.agent,
        assignTask: aki.assignTask,
        clearAgentTask: aki.clearAgentTask,
        walkToIso: aki.walkToIso,
      },
      'agent-3': {
        agent: ren.agent,
        assignTask: ren.assignTask,
        clearAgentTask: ren.clearAgentTask,
        walkToIso: ren.walkToIso,
      },
      'agent-4': {
        agent: yui.agent,
        assignTask: yui.assignTask,
        clearAgentTask: yui.clearAgentTask,
        walkToIso: yui.walkToIso,
      },
      'agent-5': {
        agent: mika.agent,
        assignTask: mika.assignTask,
        clearAgentTask: mika.clearAgentTask,
        walkToIso: mika.walkToIso,
      },
    }),
    [
      agent,
      assignTask,
      clearAgentTask,
      walkToIso,
      aki.agent,
      aki.assignTask,
      aki.clearAgentTask,
      aki.walkToIso,
      ren.agent,
      ren.assignTask,
      ren.clearAgentTask,
      ren.walkToIso,
      yui.agent,
      yui.assignTask,
      yui.clearAgentTask,
      yui.walkToIso,
      mika.agent,
      mika.assignTask,
      mika.clearAgentTask,
      mika.walkToIso,
    ],
  );
  const visibleOfficeAgents = useMemo(
    () =>
      OFFICE_WORKFLOW_AGENTS.map((spec) => ({
        spec,
        agent: officeWalkers[spec.id].agent,
      })),
    [officeWalkers],
  );
  const akiTaskIndexRef = useRef(0);
  useEffect(() => {
    if (!roomReady) return;
    if (officeStatus !== 'idle') return;
    // Work stations live on floor 1; floor 2 is the rest floor (wander only).
    if (floor !== 1) return;
    if (aki.agent.state !== 'idle') return;
    const cycle: AgentTaskType[] = ['code', 'research', 'meeting', 'document', 'print', 'rest'];
    const next = cycle[akiTaskIndexRef.current % cycle.length]!;
    akiTaskIndexRef.current += 1;
    const handle = window.setTimeout(() => aki.assignTask(next), 1500);
    return () => window.clearTimeout(handle);
  }, [aki.agent.state, aki.assignTask, floor, officeStatus, roomReady]);
  // Track character positions
  useLayoutEffect(() => {
    const visualState: Partial<Record<OfficeAgentId, AgentVisualState>> = {
      'agent-1': { position: agent.position, direction: agent.direction },
      'agent-2': { position: aki.agent.position, direction: aki.agent.direction },
      'agent-3': { position: ren.agent.position, direction: ren.agent.direction },
      'agent-4': { position: yui.agent.position, direction: yui.agent.direction },
      'agent-5': { position: mika.agent.position, direction: mika.agent.direction },
    };
    agentVisualStateRef.current = visualState;

    const update = (id: OfficeAgentId, visual: AgentVisualState) => {
      const c = charSpritesRef.current.get(id);
      if (c) {
        positionSpineAgent(c, visual, OFFICE_AGENT_SPINE_ASSET_BY_ID[id]);
      }
    };

    for (const asset of OFFICE_AGENT_SPINE_ASSETS) {
      const visual = visualState[asset.agentId];
      if (visual) update(asset.agentId, visual);
    }
  }, [
    agent.position,
    agent.direction,
    aki.agent.position,
    aki.agent.direction,
    ren.agent.position,
    ren.agent.direction,
    yui.agent.position,
    yui.agent.direction,
    mika.agent.position,
    mika.agent.direction,
  ]);

  // ── Spine animation state mapping ────────────────────────────────────────────
  const SPINE_ANIM_CANDIDATES: Record<AgentState, string[]> = {
    idle: ['normal', 'stand', 'stand2', 'sit', 'sleep'],
    walking: ['walk', 'move', 'move_left', 'normal', 'stand'],
    thinking: ['normal', 'stand', 'stand2'],
    coding: ['normal', 'stand', 'stand2'],
    researching: ['normal', 'stand', 'stand2'],
    meeting: ['normal', 'stand', 'stand2'],
    documenting: ['normal', 'stand', 'stand2'],
    reviewing: ['normal', 'stand', 'stand2'],
    printing: ['normal', 'stand', 'stand2'],
    resting: ['sit', 'sleep', 'normal', 'stand'],
    done: ['victory', 'normal', 'stand'],
    error: ['break', 'normal', 'stand'],
  };

  const ONE_SHOT_STATES = new Set<AgentState>(['done', 'error']);
  const CALM_ANIMS = ['normal', 'stand', 'stand2', 'sit', 'sleep'];

  useEffect(() => {
    const applyAnim = (id: OfficeAgentId, walker: { agent: { state: AgentState; arriveAnim?: string } }) => {
      const spine = charSpritesRef.current.get(id)?.spine as any;
      if (!spine?.state) return;
      
      // Use arriveAnim from furniture interaction slot if available
      if (walker.agent.arriveAnim) {
        const available = (spine.spineData.animations as any[]).map((a: any) => a.name) as string[];
        if (available.includes(walker.agent.arriveAnim)) {
          const current = spine.state.getCurrent(0);
          const isPlaying = (name: string) => current?.animation?.name === name;
          if (!isPlaying(walker.agent.arriveAnim)) {
            spine.state.setAnimation(0, walker.agent.arriveAnim, true);
          }
          return;
        }
      }
      
      const state = walker.agent.state;
      const candidates = SPINE_ANIM_CANDIDATES[state];
      if (!candidates) return;
      const available = (spine.spineData.animations as any[]).map((a: any) => a.name) as string[];
      const target = candidates.find((c) => available.includes(c)) ?? available[0];
      if (!target) return;
      const current = spine.state.getCurrent(0);
      const isPlaying = (name: string) => current?.animation?.name === name;

      if (ONE_SHOT_STATES.has(state)) {
        // One-shot: play once then queue calm
        if (isPlaying(target)) return; // don't restart
        spine.state.setAnimation(0, target, false);
        const calm = CALM_ANIMS.find((c) => available.includes(c)) ?? available[0];
        if (calm) spine.state.addAnimation(0, calm, true, 0);
      } else {
        // Normal looped
        if (!isPlaying(target)) {
          spine.state.setAnimation(0, target, true);
        }
      }
    };
    applyAnim('agent-1', { agent });
    applyAnim('agent-2', { agent: aki.agent });
    applyAnim('agent-3', { agent: ren.agent });
    applyAnim('agent-4', { agent: yui.agent });
    applyAnim('agent-5', { agent: mika.agent });
  }, [agent.state, agent.arriveAnim, aki.agent.state, aki.agent.arriveAnim, ren.agent.state, ren.agent.arriveAnim, yui.agent.state, yui.agent.arriveAnim, mika.agent.state, mika.agent.arriveAnim]);

  // ── Mood float + glow pulse (Y-axis bob + alpha breath) ──────────────────
  const spineBaseYRef = useRef<Map<OfficeAgentId, number>>(new Map());
  useEffect(() => {
    let rafId = 0;
    const start = performance.now();
    const loop = () => {
      const t = performance.now() - start;
      const agentStates: { id: OfficeAgentId; state: AgentState }[] = [
        { id: 'agent-1', state: agent.state },
        { id: 'agent-2', state: aki.agent.state },
        { id: 'agent-3', state: ren.agent.state },
        { id: 'agent-4', state: yui.agent.state },
        { id: 'agent-5', state: mika.agent.state },
      ];
      for (const a of agentStates) {
        const display = charSpritesRef.current.get(a.id);
        if (!display) continue;
        // Skip float until Spine is loaded (avoid capturing stale positions)
        if (spineLoadStatus[a.id] !== 'loaded') {
          display.alpha = 1.0;
          continue;
        }

        // Store base Y on first frame after load
        const initialY = spineBaseYRef.current.get(a.id);
        if (initialY === undefined) {
          spineBaseYRef.current.set(a.id, display.y);
        }

        const config = getMoodFloatConfig(a.state);

        // Float: skip for walking/error/done
        if (config.amplitude > 0 && config.periodMs > 0) {
          const floatPhase = Math.sin((t / config.periodMs) * Math.PI * 2);
          const floatOffset = floatPhase * config.amplitude;
          const baseY = spineBaseYRef.current.get(a.id) ?? display.y;
          display.y = baseY + floatOffset;
        }

        // Alpha breath
        const [alphaMin, alphaMax] = config.alphaRange;
        if (alphaMin >= alphaMax) {
          display.alpha = alphaMax;
        } else {
          const breathPhase = Math.sin(t / (config.periodMs || 3000)) * 0.5 + 0.5;
          display.alpha = alphaMin + (alphaMax - alphaMin) * breathPhase;
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      spineBaseYRef.current.clear();
    };
  }, [agent.state, aki.agent.state, ren.agent.state, yui.agent.state, mika.agent.state, spinesReady]);

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ── Dorm mechanics (Azur Lane style) ────────────────────────────────────────
  // Comfort counts furniture on both floors.
  const comfort = useMemo(
    () => computeComfort(objects) + computeComfort(inactiveFloorObjects),
    [objects, inactiveFloorObjects],
  );
  const officeWalkersRef = useRef(officeWalkers);
  useEffect(() => {
    officeWalkersRef.current = officeWalkers;
  }, [officeWalkers]);
  useEffect(() => {
    dormRef.current = dorm;
  }, [dorm]);
  useEffect(() => {
    comfortRef.current = comfort;
  }, [comfort]);
  // Dorm tick: food drain + passive XP / morale / affection.
  useDormTickLoop({
    roomReady,
    agentIds: DORM_AGENT_IDS,
    officeWalkersRef,
    comfortRef,
    setDorm,
    intervalMs: DORM_TICK_MS,
  });
  // Idle chibi wandering: send a random idle agent for a stroll.
  useEffect(() => {
    if (!roomReady) return;
    if (mode === 'move') return;
    const id = setInterval(() => {
      if (document.hidden) return;
      if (officeStatusRef.current !== 'idle') return;
      const idleWalkers = DORM_AGENT_IDS.map(
        (agentId) => officeWalkersRef.current[agentId],
      ).filter((walker) => walker.agent.state === 'idle');
      if (idleWalkers.length === 0) return;
      const walker = idleWalkers[Math.floor(Math.random() * idleWalkers.length)]!;
      const blocked = new Set(routeGrid.blockedCells.map((cell) => `${cell.x},${cell.y}`));
      for (let attempt = 0; attempt < 10; attempt++) {
        const cx = Math.floor(Math.random() * roomW);
        const cy = Math.floor(Math.random() * roomH);
        if (blocked.has(`${cx},${cy}`)) continue;
        if (walker.walkToIso({ wx: cx, wy: cy, wz: 0 })) break;
      }
    }, WANDER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [roomReady, mode, routeGrid, roomW, roomH]);
  // Keep tokensRef in sync for safe reads inside purchase handlers
  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);
  // Persist Train daily state when trainCount changes (skip pre-load fire)
  useEffect(() => {
    if (!trainStorageLoadedRef.current) return;
    try {
      localStorage.setItem(TRAIN_DATE_KEY, getLocalDateKey());
      localStorage.setItem(TRAIN_COUNT_KEY, String(trainCount));
    } catch {
      /* ignore */
    }
  }, [trainCount]);
  // Speech bubbles
  const CHATTER = [
    'Hmm~',
    'I wonder...',
    'Ah, an idea!',
    'So cozy!',
    'Working hard!',
    'Zzz... oh!',
    'Need supplies~',
    "Let's go!",
  ];
  useEffect(() => {
    const tick = () => {
      setAgentBubble(CHATTER[Math.floor(Math.random() * CHATTER.length)]!);
      setTimeout(() => setAgentBubble(null), 2500);
    };
    const t = setTimeout(() => {
      tick();
      setInterval(() => {
        if (!document.hidden) tick();
      }, 15000);
    }, 8000);
    return () => clearTimeout(t);
  }, []);
  // Heart cleanup
  useEffect(() => {
    if (!floatingHearts.length) return;
    const id = setInterval(
      () => setFloatingHearts((h) => h.filter((x) => performance.now() - x.createdAt < 1500)),
      200,
    );
    return () => clearInterval(id);
  }, [floatingHearts.length]);
  // Keep refs in sync
  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    roomWRef.current = roomW;
  }, [roomW]);
  useEffect(() => {
    roomHRef.current = roomH;
  }, [roomH]);
  useEffect(() => {
    coinsRef.current = coins;
  }, [coins]);

  // ── PixiJS init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let mounted = true;
    const app = new PIXI.Application({
      view: canvas,
      width: CANVAS_W,
      height: CANVAS_H,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    appRef.current = app;

    (async () => {
      let roomObjects = DEFAULT_OBJECTS;
      try {
        const loaded = await loadRoomJSON(ROOM_MAP_URL);
        if (loaded.length > 0) roomObjects = loaded.map((o) => snapObj(o));
      } catch {
        /* use defaults */
      }

      let loadedInactiveFloor: RoomObject[] = [];
      let loadedDormRaw: unknown = null;
      try {
        // v8 first, then legacy v7 (which has no dorm/floor2/token fields).
        const saved =
          localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as {
            objects?: RoomObject[];
            floor2Objects?: RoomObject[];
            roomName?: string;
            happiness?: number;
            floor?: number;
            coins?: number;
            tokens?: number;
            nextId?: number;
            roomW?: number;
            roomH?: number;
            themeKey?: string;
            dorm?: unknown;
          };
          const loadedW =
            typeof parsed.roomW === 'number'
              ? Math.max(6, Math.min(16, parsed.roomW))
              : ROOM_TILES_X;
          const loadedH =
            typeof parsed.roomH === 'number'
              ? Math.max(5, Math.min(14, parsed.roomH))
              : ROOM_TILES_Y;
          setRoomW(loadedW);
          roomWRef.current = loadedW;
          setRoomH(loadedH);
          roomHRef.current = loadedH;
          if (parsed.objects?.length)
            roomObjects = parsed.objects.map((o) => snapObj(o, loadedW, loadedH));
          if (Array.isArray(parsed.floor2Objects))
            loadedInactiveFloor = parsed.floor2Objects.map((o) => snapObj(o, loadedW, loadedH));
          if (parsed.roomName) setRoomName(parsed.roomName);
          if (typeof parsed.happiness === 'number') setHappiness(parsed.happiness);
          if (typeof parsed.coins === 'number') {
            setCoins(parsed.coins);
            coinsRef.current = parsed.coins;
          }
          if (typeof parsed.tokens === 'number') {
            const loadedTokens = Math.max(0, parsed.tokens);
            setTokens(loadedTokens);
            tokensRef.current = loadedTokens;
          }
          if (
            parsed.themeKey === 'auto' ||
            (ROOM_THEME_KEYS as string[]).includes(parsed.themeKey ?? '')
          ) {
            setThemeKey(parsed.themeKey as 'auto' | RoomThemeKey);
          } else if (parsed.themeKey === 'day') {
            // migrate legacy 'day' → 'morning'
            setThemeKey('morning');
          }
          loadedDormRaw = parsed.dorm ?? null;
          if (typeof parsed.nextId === 'number') nextIdRef.current = parsed.nextId;
        }
      } catch {
        /* ignore */
      }

      // ── Train daily reset ───────────────────────────────────────────────
      try {
        const today = getLocalDateKey();
        const savedDate = localStorage.getItem(TRAIN_DATE_KEY);
        const savedCount = localStorage.getItem(TRAIN_COUNT_KEY);
        if (savedDate === today && savedCount !== null) {
          const parsed = parseInt(savedCount, 10);
          const clamped = Number.isFinite(parsed) ? Math.min(TRAIN_MAX, Math.max(0, parsed)) : 0;
          setTrainCount(clamped);
        } else {
          // New day or no data — reset
          localStorage.setItem(TRAIN_DATE_KEY, today);
          localStorage.setItem(TRAIN_COUNT_KEY, '0');
          setTrainCount(0);
        }
      } catch {
        /* ignore */
      }
      trainStorageLoadedRef.current = true;

      const shared = parseSharedLayoutFromUrl();
      if (shared) {
        setRoomW(shared.roomW);
        roomWRef.current = shared.roomW;
        setRoomH(shared.roomH);
        roomHRef.current = shared.roomH;
        setRoomName(shared.roomName);
        setHappiness(shared.happiness);
        setFloor(shared.floor);
        setCoins(shared.coins);
        coinsRef.current = shared.coins;
        roomObjects = shared.objects.map((o) => snapObj(o, shared.roomW, shared.roomH));
        removeSharedLayoutQuery();
      }

      // Ensure nextIdRef is greater than any existing id on either floor
      const maxId = Math.max(
        ...roomObjects.map((o) => o.id),
        ...loadedInactiveFloor.map((o) => o.id),
        999,
      );
      if (nextIdRef.current <= maxId) nextIdRef.current = maxId + 1;

      setInactiveFloorObjects(loadedInactiveFloor);

      // ── Dorm offline catch-up ─────────────────────────────────────────────
      const nowMs = Date.now();
      const revivedDorm = reviveDormState(loadedDormRaw, DORM_AGENT_IDS, nowMs);
      const comfortAtLoad = computeComfort(roomObjects) + computeComfort(loadedInactiveFloor);
      const catchUp = tickDorm(revivedDorm, nowMs, { comfort: comfortAtLoad });
      setDorm(catchUp.state);
      dormRef.current = catchUp.state;
      if (catchUp.elapsedMs >= 60_000) {
        const awayMinutes = Math.round(catchUp.elapsedMs / 60_000);
        showToast(
          `Away ${awayMinutes}m · +${catchUp.xpPerCharacter} XP each · 🍙 -${catchUp.foodConsumed.toLocaleString()}`,
        );
      }

      setObjects(roomObjects);
      objectsRef.current = roomObjects;
      if (mounted) setRoomReady(true);

      setRoomProjection(roomWRef.current, roomHRef.current);
      const scene = buildRoomScene(app.stage, roomObjects, {
        onSelect: (id) => {
          if (modeRef.current === 'move') return;
          setSelectedId((prev) => (prev === id ? null : id));
        },
        onDragStart: drag.onDragStart,
      });
      sceneRef.current = scene;
      drawBackground(scene.backgroundGraphics, roomWRef.current, roomHRef.current, theme);
      drawThemeParticles(scene.particleGraphics, roomWRef.current, roomHRef.current, theme);

      // ── Load real Spine 3.8 characters ────────────────────────────────────
      for (const def of OFFICE_AGENT_SPINE_ASSETS) {
        PIXI.Assets.load([def.skel, def.atlas])
          .then((loaded: Record<string, any>) => {
            if (!mounted) return;
            const skelKey = def.skel;
            const spineData = loaded[skelKey]?.spineData;
            if (!spineData) {
              console.warn(`[Spine] No spineData for ${def.assetId}`);
              setSpineLoadStatus((prev) => ({ ...prev, [def.agentId]: 'failed' }));
              return;
            }
            const spine = new Spine(spineData);
            const [sx, sy] = proj(def.fallbackIso.wx, def.fallbackIso.wy, def.fallbackIso.wz);
            // Log animation names + play calm lounge default before measuring
            // bounds; Spine assets do not share a consistent skeleton origin.
            const animNames = spine.spineData.animations.map((a: any) => a.name);
            console.log(`[Spine] ${def.assetId} animations:`, animNames);
            if (animNames.length > 0) {
              const priority = ['normal', 'stand', 'stand2', 'sit', 'sleep'];
              const target = priority.find((a) => animNames.includes(a)) ?? animNames[0];
              spine.state.setAnimation(0, target, true);
              (spine as any).update?.(0);
            }
            normalizeSpineFootAnchor(spine);

            const display = new PIXI.Container() as SpineAgentDisplay;
            display.spine = spine;
            display.addChild(spine);
            positionSpineAgent(
              display,
              agentVisualStateRef.current[def.agentId] ?? {
                position: { x: sx, y: sy },
                direction: 'down',
              },
              def,
            );
            scene.furnitureLayer.addChild(display);
            charSpritesRef.current.set(def.agentId, display);
            setSpineLoadStatus((prev) => ({ ...prev, [def.agentId]: 'loaded' }));

            // ── Tap interaction ──────────────────────────────────────────
            display.eventMode = 'static';
            display.cursor = 'pointer';
            display.hitArea = new PIXI.Circle(0, -def.hitAreaRadius, def.hitAreaRadius);
            display.on('pointertap', () => {
              // ── Headpat: affection gain with per-character cooldown ──
              const now = Date.now();
              const dormNow = dormRef.current;
              if (!dormNow) return;
              const headpat = applyHeadpat(dormNow, def.agentId, now);
              if (!headpat.accepted) {
                if (now - lastCooldownToastRef.current > 1000) {
                  lastCooldownToastRef.current = now;
                  showToast('Wait a moment~');
                }
                return;
              }
              dormRef.current = headpat.state;
              setDorm(headpat.state);

              const state = (spine as any).state;
              const anims = ((spine as any).spineData.animations as any[]).map((a: any) => a.name);
              const oneShotAnims = new Set(['victory', 'break']);
              const current = state.getCurrent(0);
              if (!current || !oneShotAnims.has(current.animation.name)) {
                const tap = ['touch', 'motou'].find((a) => anims.includes(a));
                if (tap && current?.animation?.name !== tap) {
                  state.setAnimation(0, tap, false);
                  const calm =
                    ['normal', 'stand', 'stand2', 'sit', 'sleep'].find((c) => anims.includes(c)) ??
                    anims[0];
                  if (calm) state.addAnimation(0, calm, true, 0);
                }
              }

              const spec = OFFICE_WORKFLOW_AGENTS.find((item) => item.id === def.agentId);
              setFloatingHearts((prev) => [
                ...prev,
                {
                  id: ++heartIdRef.current,
                  x: sx,
                  y: sy - 60,
                  createdAt: performance.now(),
                },
              ]);
              showToast(
                `♥ ${spec?.name ?? def.agentId} +${HEADPAT_AFFECTION} · ${Math.floor(headpat.affection)}/${AFFECTION_MAX}`,
              );
            });
          })
          .catch((e: Error) => {
            if (!mounted) return;
            console.error(`[Spine] Failed to load ${def.assetId}:`, e.message);
            setSpineLoadStatus((prev) => ({ ...prev, [def.agentId]: 'failed' }));
          });
      }

      app.stage.on('pointermove', drag.onPointerMove);
      app.stage.on('pointerup', drag.endDrag);
      app.stage.on('pointerupoutside', drag.endDrag);
    })(); // close async IIFE

    return () => {
      mounted = false;
      charSpritesRef.current.clear();
      appRef.current?.destroy();
      appRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  // ── Selection highlight ─────────────────────────────────────────────────────
  useEffect(() => {
    sceneRef.current?.setSelected(selectedId);
  }, [selectedId]);

  // ── Background shell (room size change) ─────────────────────────────────────
  useEffect(() => {
    if (!sceneRef.current?.backgroundGraphics) return;
    setRoomProjection(roomW, roomH);
    drawBackground(sceneRef.current.backgroundGraphics, roomW, roomH, theme);
    drawThemeParticles(sceneRef.current.particleGraphics, roomW, roomH, theme);
    sceneRef.current.rebuild(objectsRef.current);
  }, [roomW, roomH, theme]);

  // ── Tile grid overlay (edit mode + room size change) ────────────────────────
  useEffect(() => {
    sceneRef.current?.setEditMode(mode === 'move', roomW, roomH);
  }, [mode, roomW, roomH]);

  // ── Active station pulse (driven by agent work lifecycle) ───────────────────
  const workingAgent = visibleOfficeAgents.find(
    (entry) => entry.agent.workDurationMs !== undefined,
  )?.agent;
  const working = workingAgent?.workDurationMs !== undefined;
  const stationId = workingAgent?.targetStationId as LoungeStationId | undefined;
  // Resolve the furniture id once per object/station change so the pulse RAF
  // only restarts when the matching furniture itself is added, removed, or
  // swapped — not on every unrelated edit to the objects array.
  const activeStationFurnitureId = useMemo<number | null>(() => {
    if (!working || !stationId) return null;
    const station = loungeStations[stationId];
    if (!station) return null;
    const match = objects.find((o) => o.furnitureType === station.furnitureType);
    return match ? match.id : null;
  }, [working, stationId, objects]);
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (activeStationFurnitureId === null) {
      scene.setActiveStation(null, 0);
      return;
    }

    let rafId = 0;
    const start = performance.now();
    const loop = () => {
      const elapsed = performance.now() - start;
      const alpha = 0.55 + 0.35 * Math.sin(elapsed / 220);
      sceneRef.current?.setActiveStation(activeStationFurnitureId, alpha);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      sceneRef.current?.setActiveStation(null, 0);
    };
  }, [activeStationFurnitureId]);

  // ── Scale / camera ───────────────────────────────────────────────────────────
  useEffect(() => {
    const updateScale = () => {
      const node = viewportRef.current;
      if (!node) return;
      const isMobile = node.clientWidth < 760;
      const sw = (node.clientWidth - (isMobile ? 12 : 24)) / CANVAS_W;
      const sh = (node.clientHeight - (isMobile ? 18 : 28)) / CANVAS_H;
      const baseScale = Math.min(sw, sh);
      setScale(
        isMobile
          ? Math.max(0.7, Math.min(baseScale * 1.12, 1.05))
          : Math.max(0.88, Math.min(baseScale * 1.22, 1.42)),
      );
      setCameraY(isMobile ? -8 : -18);
      setPanX(0);
      setPanY(0);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // ── Pan & Zoom ───────────────────────────────────────────────────────────────
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const d = e.deltaY > 0 ? -0.08 : 0.08;
      const ns = Math.max(0.5, Math.min(2.5, scale + d));
      const r = ns / scale;
      const rect = e.currentTarget.getBoundingClientRect();
      setPanX((p) => e.clientX - rect.left - (e.clientX - rect.left - p) * r);
      setPanY((p) => e.clientY - rect.top - (e.clientY - rect.top - p) * r);
      setScale(ns);
      scaleRef.current = ns;
    },
    [scale],
  );
  const handlePanStart = useCallback(
    (e: React.MouseEvent) => {
      if (modeRef.current !== 'visit') return;
      if ((e.target as HTMLElement).closest('button,input,a')) return;
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
    },
    [panX, panY],
  );
  const handlePanMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      setPanX(panStartRef.current.panX + e.clientX - panStartRef.current.x);
      setPanY(panStartRef.current.panY + e.clientY - panStartRef.current.y);
    },
    [isPanning],
  );
  const handlePanEnd = useCallback(() => setIsPanning(false), []);

  // ── Persist ──────────────────────────────────────────────────────────────────
  useLoungePersistence({
    roomReady,
    nextIdRef,
    snapshot: {
      objects,
      inactiveFloorObjects,
      roomName,
      happiness,
      floor,
      coins,
      tokens,
      themeKey,
      dorm,
      roomW,
      roomH,
    },
  });

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const showToast = useCallback((text: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(text);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const appendOfficeChat = useCallback((message: Omit<OfficeChatMessage, 'id'>) => {
    const id = `chat-${++officeChatIdRef.current}`;
    setOfficeChat((prev) => [...prev, { id, ...message }].slice(-8));
  }, []);

  // officeStatusRef: a live-read handle for the "Idle chibi wandering" interval
  // above (declared earlier in this component), which never restarts on
  // officeStatus changes and instead checks this ref inside its setInterval
  // callback. Independent of useDialogueScheduler's own internal copy.
  const officeStatusRef = useRef(officeStatus);
  useEffect(() => {
    officeStatusRef.current = officeStatus;
  }, [officeStatus]);

  const { activeDialogueBubble } = useDialogueScheduler({
    officeStatus,
    roomReady,
    agents: [
      { id: 'agent-1', state: agent.state },
      { id: 'agent-2', state: aki.agent.state },
      { id: 'agent-3', state: ren.agent.state },
      { id: 'agent-4', state: yui.agent.state },
      { id: 'agent-5', state: mika.agent.state },
    ],
    appendOfficeChat,
    enableLlmDialogue: ENABLE_LLM_DIALOGUE,
  });

  // ── socket run lifecycle (failed/cancelled only; started/completed handled by REST) ──
  const handleRunFailed = useCallback(({ run }: { run: { id: string } }) => {
    if (!officeInFlightRunIdRef.current) return;
    if (run.id !== officeInFlightRunIdRef.current) return;
    appendOfficeChat({
      agentId: OFFICE_WORKFLOW_AGENTS[0].id,
      kind: 'blocked',
      text: '⚠️ Backend run failed',
    });
  }, []);

  const handleRunCancelled = useCallback(({ run }: { run: { id: string } }) => {
    if (!officeInFlightRunIdRef.current) return;
    if (run.id !== officeInFlightRunIdRef.current) return;
    appendOfficeChat({
      agentId: OFFICE_WORKFLOW_AGENTS[0].id,
      kind: 'blocked',
      text: '✕ Backend run cancelled',
    });
  }, []);

  useRunSocket({
    onRunFailed: handleRunFailed,
    onRunCancelled: handleRunCancelled,
  });

  const appendOfficeToolEvent = useCallback((event: Omit<OfficeToolEvent, 'id'>) => {
    const id = `tool-${++officeToolEventIdRef.current}`;
    setOfficeToolEvents((prev) => [...prev, { id, ...event }].slice(-6));
  }, []);

  /** Resolves true when the workflow actually started. */
  const handleRunOfficeCommand = useCallback(async (commandOverride?: string, guard?: RunGuard) => {
    const cmd = commandOverride ?? officeCommand;
    if (!roomReady) {
      showToast('Room is loading');
      return false;
    }
    // A manual run supersedes any pending autonomous cycle; an autonomous run is
    // re-checked after the planner await, since Auto may be switched off meanwhile.
    if (!guard) cancelAutonomousCycle();
    const wanted = () => !guard || guard();

    const busyAgentIds = Object.entries(officeWalkers)
      .filter(([, w]) => w.agent.state !== 'idle')
      .map(([id]) => id as OfficeAgentId);

    // Try LLM planner first, fall back to rule-based
    let steps = planWorkflowSteps(cmd, { busyAgentIds });
    // Only autonomous runs are abortable, so toggling Auto never downgrades a manual run's plan.
    const controller = guard ? new AbortController() : null;
    if (controller) plannerAbortRef.current = controller;
    try {
      const { planWorkflowLLM } = await import('@/game/dialogue/dialogueAdapter');
      const llmResult = await planWorkflowLLM(
        { commandText: cmd, busyAgentIds },
        { signal: controller?.signal },
      );
      if (wanted() && llmResult && llmResult.steps.length > 0) {
        const converted = convertLLMSteps(llmResult.steps);
        if (converted.length > 0) {
          steps = converted;
          appendOfficeChat({
            agentId: steps[0]!.agentId,
            kind: 'status',
            text: llmResult.source === 'llm' ? '🧠 LLM planned this workflow' : '📋 Rule-based plan',
          });
        }
      }
    } catch {
      // Use rule-based fallback (already set)
    } finally {
      if (controller && plannerAbortRef.current === controller) plannerAbortRef.current = null;
    }
    if (!wanted()) return false;
    const first = steps[0];

    officeStepInFlightRef.current = null;
    setActiveOfficeCommand(cmd);
    setOfficeSteps(steps);
    setOfficeStepIndex(0);
    setOfficeStatus('running');
    setOfficeToolEvents([]);
    setOfficeChat([]);

    if (first) {
      appendOfficeChat({
        agentId: first.agentId,
        toAgentId: first.handoffTo,
        kind: 'status',
        text: 'Command accepted. Starting map-first handoff.',
      });
    }
    showToast('Office workflow started');
    return true;
  }, [appendOfficeChat, cancelAutonomousCycle, officeCommand, roomReady, showToast]);

  const handlePauseOfficeWorkflow = useCallback(() => {
    setOfficeStatus((current) => {
      if (current === 'running') return 'paused';
      if (current === 'paused') return 'running';
      return current;
    });
  }, []);

  const handleResetOfficeWorkflow = useCallback(() => {
    cancelAutonomousCycle();
    officeStepInFlightRef.current = null;
    Object.values(officeWalkers).forEach((walker) => walker.clearAgentTask());
    setOfficeStatus('idle');
    setOfficeStepIndex(0);
    setOfficeToolEvents([]);
    setOfficeChat([]);
    showToast('Office workflow reset');
  }, [cancelAutonomousCycle, officeWalkers, showToast]);

  useEffect(() => {
    if (officeStatus !== 'running') return;

    const step = officeSteps[officeStepIndex];
    if (!step) {
      setOfficeStatus('done');
      return;
    }

    const walker = officeWalkers[step.agentId];

    if (officeStepInFlightRef.current === null) {
      if (walker.agent.state !== 'idle') return;

      walker.assignTask(step.taskType);
      officeStepInFlightRef.current = step.id;

      // ── Team gathering: idle agents join the meeting ────────────────────
      if (step.taskType === 'meeting') {
        const currentObjects = objectsRef.current;
        const meetingStation = resolveLoungeStation('meetingTable', currentObjects);
        const meetingIso = meetingStation.interactionIsoPoint;
        // Spread agents around the meeting table so they don't cluster.
        // Offsets in iso grid units — large enough to be visible (1 grid ≈ 60px).
        const offsets = [
          { dx: 0, dy: 0 },
          { dx: 2.0, dy: 1.0 },
          { dx: -2.0, dy: -1.0 },
          { dx: 1.5, dy: -2.0 },
          { dx: -1.5, dy: 2.0 },
        ];
        let offsetIdx = 0;
        for (const [id, w] of Object.entries(officeWalkers)) {
          if (id === step.agentId) continue; // skip the meeting lead
          if (w.agent.state === 'idle') {
            const off = offsets[offsetIdx++ % offsets.length]!;
            const meetingPoint = {
              wx: meetingIso.x + off.dx,
              wy: meetingIso.y + off.dy,
              wz: (meetingIso.z ?? 0) + 0.2,
            };
            w.walkToIso(meetingPoint);
            appendOfficeChat({
              agentId: id as OfficeAgentId,
              kind: 'status',
              text: `Joining ${OFFICE_WORKFLOW_AGENTS.find(a => a.id === step.agentId)?.name ?? 'team'} at the meeting table.`,
            });
          }
        }
      }

      // Fire-and-forget: call backend run start, store returned run ID for completion
      startOfficeRun(OFFICE_CANONICAL_TASK_ID)
        .then((run) => {
          if (run) {
            officeInFlightRunIdRef.current = run.id;
            appendOfficeChat({
              agentId: step.agentId,
              kind: 'status',
              text: '🔗 Backend run linked',
            });
          } else {
            appendOfficeChat({
              agentId: step.agentId,
              kind: 'status',
              text: '⚡ Demo fallback · backend unavailable',
            });
          }
        })
        .catch(() => {
          appendOfficeChat({
            agentId: step.agentId,
            kind: 'status',
            text: '⚡ Demo fallback · backend unavailable',
          });
        });
      appendOfficeChat({
        agentId: step.agentId,
        toAgentId: step.handoffTo,
        kind: 'handoff',
        text: describeOfficeStepStart(step, activeOfficeCommand),
      });
      appendOfficeToolEvent(createOfficeToolEvent(step));
      return;
    }

    if (officeStepInFlightRef.current !== step.id) return;

    if (walker.agent.state === 'error') {
      appendOfficeChat({
        agentId: step.agentId,
        kind: 'blocked',
        text: `${step.title} blocked. Waiting for path or layout fix.`,
      });
      setOfficeStatus('paused');
      return;
    }

    if (walker.agent.state !== 'idle') return;

    const nextStep = officeSteps[officeStepIndex + 1];
    officeStepInFlightRef.current = null;
    appendOfficeChat({
      agentId: step.agentId,
      toAgentId: nextStep?.agentId,
      kind: 'done',
      text: describeOfficeStepDone(step, nextStep),
    });

    if (nextStep) {
      setOfficeStepIndex((current) => current + 1);
    } else {
      setOfficeStatus('done');
      setTokens((t) => t + WORKFLOW_DONE_TOKENS);
      showToast(`Office workflow done · +${WORKFLOW_DONE_TOKENS} 🎀`);
    }
    // Fire-and-forget: call backend run complete with in-flight run ID
    const runId = officeInFlightRunIdRef.current;
    if (runId) {
      completeOfficeRun(runId)
        .then((result) => {
          if (result)
            appendOfficeChat({
              agentId: step.agentId,
              kind: 'status',
              text: '✅ Backend run completed',
            });
        })
        .catch(() => {});
      officeInFlightRunIdRef.current = null;
    }
  }, [
    activeOfficeCommand,
    appendOfficeChat,
    appendOfficeToolEvent,
    officeStatus,
    officeStepIndex,
    officeSteps,
    officeWalkers,
    showToast,
  ]);

  const handleToggleAutonomousMode = useCallback(() => {
    const next = !autonomousModeRef.current;
    autonomousModeRef.current = next;
    cancelAutonomousCycle();
    setAutonomousMode(next);
    showToast(
      next
        ? `Auto on: ${AUTONOMOUS_COOLDOWN_MS / 1000}s after each run, Mai starts another (one LLM planner call per run)`
        : 'Auto off',
    );
  }, [cancelAutonomousCycle, showToast]);

  // ── Autonomous orchestration: Lead auto-restarts on workflow completion ──
  useEffect(() => {
    if (!autonomousMode) return;
    if (officeStatus !== 'done') return;

    const lead = officeWalkers[AUTONOMOUS_LEAD_ID];
    if (lead?.agent.state !== 'idle') return;

    const cycle = autonomousCycleRef.current;
    const isStillWanted = () => autonomousModeRef.current && autonomousCycleRef.current === cycle;

    autonomousTimerRef.current = setTimeout(() => {
      if (!isStillWanted()) return;
      const cmd =
        AUTONOMOUS_COMMANDS[
          Math.floor(Math.random() * AUTONOMOUS_COMMANDS.length)
        ]!;

      // Reset and start with auto-selected command
      officeStepInFlightRef.current = null;
      setOfficeSteps([]);
      setOfficeStepIndex(0);
      setOfficeStatus('idle');

      // Brief tick for React state, then fire. Not cleared by the effect cleanup (the
      // status change above re-runs this effect), so re-check the cycle here.
      setTimeout(() => {
        if (!isStillWanted()) return;
        appendOfficeChat({
          agentId: AUTONOMOUS_LEAD_ID,
          kind: 'status',
          text: `🤖 Mai (Lead): Orchestrating next mission — "${cmd}"`,
        });
        void handleRunOfficeCommand(cmd, isStillWanted).then((started) => {
          if (started) return;
          appendOfficeChat({
            agentId: AUTONOMOUS_LEAD_ID,
            kind: 'status',
            text: '🤖 Mai (Lead): Next mission cancelled',
          });
        });
      }, 400);
    }, AUTONOMOUS_COOLDOWN_MS);

    return () => {
      if (autonomousTimerRef.current) {
        clearTimeout(autonomousTimerRef.current);
      }
    };
  }, [autonomousMode, officeStatus, officeWalkers, appendOfficeChat, handleRunOfficeCommand, showToast]);

  // Cancel any in-flight autonomous cycle on unmount.
  useEffect(() => cancelAutonomousCycle, [cancelAutonomousCycle]);

  // ── Happiness with cap ───────────────────────────────────────────────────────
  // Functional update so rapid same-frame calls never read a stale snapshot.
  const addHappiness = useCallback((amount: number) => {
    setHappiness((prev) => Math.min(HAPPINESS_MAX, prev + amount));
  }, []);

  useEffect(() => {
    if (happiness >= HAPPINESS_MAX && !happinessMaxReachedRef.current) {
      happinessMaxReachedRef.current = true;
      showToast('Max happiness! 🥳');
    }
  }, [happiness, showToast]);

  // ── Task completion reward ──────────────────────────────────────────────────
  useEffect(() => {
    const prevState = previousAgentStateRef.current;
    const prevTaskType = previousTaskTypeRef.current;
    if (
      agent.state === 'idle' &&
      prevState !== 'idle' &&
      prevState !== 'walking' &&
      prevState !== 'error' &&
      prevTaskType &&
      prevTaskType !== 'idle'
    ) {
      const reward = TASK_REWARDS[prevTaskType] ?? { coins: 0, happiness: 0 };
      if (reward.coins > 0 || reward.happiness > 0) {
        const foodPctNow = Math.round(((dormRef.current?.food ?? 0) / FOOD_CAP) * 100);
        const isLowFood = foodPctNow <= FOOD_LOW_THRESHOLD_PCT;
        const rewardMult = isLowFood ? FOOD_LOW_REWARD_MULT : 1;
        const rewardCoins = Math.round(reward.coins * rewardMult);
        const rewardHappiness = Math.round(reward.happiness * rewardMult);
        setCoins((c) => c + rewardCoins);
        setTokens((t) => t + TASK_DONE_TOKENS);
        addHappiness(rewardHappiness);
        const toastSuffix = isLowFood ? '  📉 Low food' : '';
        showToast(
          `+${rewardCoins} 🪙  +${TASK_DONE_TOKENS} 🎀  +${rewardHappiness} ♡${toastSuffix}`,
        );
      }
    }
    previousAgentStateRef.current = agent.state;
    previousTaskTypeRef.current = agent.taskType;
  }, [agent.state, agent.taskType, showToast]);

  // ── Morale: every agent's task completion drains (rest restores) ────────────
  const prevWalkerSnapshotRef = useRef<
    Record<string, { state: AgentState; taskType?: AgentTaskType }>
  >({});
  useEffect(() => {
    const prevSnapshot = prevWalkerSnapshotRef.current;
    const nextSnapshot: Record<string, { state: AgentState; taskType?: AgentTaskType }> = {};
    for (const { spec, agent: walkerAgent } of visibleOfficeAgents) {
      nextSnapshot[spec.id] = { state: walkerAgent.state, taskType: walkerAgent.taskType };
      const prev = prevSnapshot[spec.id];
      if (!prev) continue;
      const completedTask =
        walkerAgent.state === 'idle' &&
        prev.state !== 'idle' &&
        prev.state !== 'walking' &&
        prev.state !== 'error' &&
        prev.taskType !== undefined &&
        prev.taskType !== 'idle'
          ? prev.taskType
          : null;
      if (completedTask) {
        setDorm((d) => applyTaskMorale(d, spec.id, completedTask));
      }
    }
    prevWalkerSnapshotRef.current = nextSnapshot;
  }, [visibleOfficeAgents]);

  const applyLayoutObjects = useCallback((nextObjects: RoomObject[]) => {
    const snapped = nextObjects.map((obj) => snapObj(obj, roomWRef.current, roomHRef.current));
    objectsRef.current = snapped;
    sceneRef.current?.rebuild(snapped);
    setObjects(cloneLayout(snapped));
    setSelectedId((prev) => (prev !== null && snapped.some((o) => o.id === prev) ? prev : null));
  }, []);

  const pushHistorySnapshot = useCallback((snapshot: RoomObject[]) => {
    historyRef.current.push(cloneLayout(snapshot));
    if (historyRef.current.length > 50) historyRef.current.shift();
    redoRef.current = [];
  }, []);

  const drag = useFurnitureDrag({
    objectsRef,
    roomWRef,
    roomHRef,
    scaleRef,
    modeRef,
    sceneRef,
    setObjects,
    pushHistorySnapshot,
  });

  const handleUndo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) {
      showToast('Nothing to undo');
      return;
    }
    redoRef.current.push(cloneLayout(objectsRef.current));
    applyLayoutObjects(prev);
    showToast('Undo');
  }, [applyLayoutObjects, showToast]);

  const handleRedo = useCallback(() => {
    const next = redoRef.current.pop();
    if (!next) {
      showToast('Nothing to redo');
      return;
    }
    historyRef.current.push(cloneLayout(objectsRef.current));
    applyLayoutObjects(next);
    showToast('Redo');
  }, [applyLayoutObjects, showToast]);

  const handleAutoArrange = useCallback(() => {
    const arranged = autoArrangeLayout(objectsRef.current, roomWRef.current, roomHRef.current);
    if (!arranged) {
      showToast('Could not auto-arrange all items');
      return;
    }
    pushHistorySnapshot(objectsRef.current);
    applyLayoutObjects(arranged);
    showToast('Auto-arranged');
  }, [applyLayoutObjects, pushHistorySnapshot, showToast]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleTrain = useCallback(() => {
    if (trainCount >= TRAIN_MAX) {
      showToast('Training complete for today!');
      return;
    }
    addHappiness(5);
    setCoins((c) => c + TRAIN_REWARD);
    setTokens((t) => t + TRAIN_TOKENS);
    setTrainCount((t) => t + 1);
    // Tactical class: every dorm character gains XP.
    const dormNow = dormRef.current;
    if (dormNow) {
      const trained = applyTrainingXp(dormNow, TRAIN_XP);
      dormRef.current = trained.state;
      setDorm(trained.state);
      const levelNote = trained.levelUps > 0 ? `  ⬆ Lv +${trained.levelUps}` : '';
      showToast(`+${TRAIN_REWARD} 🪙  +${TRAIN_TOKENS} 🎀  +${TRAIN_XP} XP${levelNote}`);
    } else {
      showToast(`+${TRAIN_REWARD} 🪙  +${TRAIN_TOKENS} 🎀`);
    }
  }, [addHappiness, trainCount, showToast]);

  const handlePurchase = useCallback(
    (item: CatalogItem) => {
      if (coinsRef.current < item.cost) {
        showToast('Not enough coins');
        return;
      }
      if (tokensRef.current < item.tokenCost) {
        showToast('Not enough decor tokens');
        return;
      }

      const spawn = getDefaultSpawnPosition(item.type);
      const placed = selectPurchasePlacement({
        item,
        existingObjects: objectsRef.current,
        defaultSpawn: spawn,
        roomW: roomWRef.current,
        roomH: roomHRef.current,
      });

      if (!placed) {
        showToast('No free space');
        return;
      }

      pushHistorySnapshot(objectsRef.current);
      coinsRef.current -= item.cost;
      setCoins(coinsRef.current);
      tokensRef.current -= item.tokenCost;
      setTokens(tokensRef.current);
      addHappiness(item.happiness);

      const newId = nextIdRef.current++;
      const newObj: RoomObject = { ...placed, id: newId };
      objectsRef.current = [...objectsRef.current, newObj];
      sceneRef.current?.addItem(newObj);
      setObjects([...objectsRef.current]);
      setSelectedId(newId);
    },
    [pushHistorySnapshot, showToast],
  );

  const handleDelete = useCallback(
    (id: number) => {
      pushHistorySnapshot(objectsRef.current);
      objectsRef.current = objectsRef.current.filter((o) => o.id !== id);
      sceneRef.current?.removeItem(id);
      setObjects([...objectsRef.current]);
      setSelectedId(null);
      showToast('Item removed');
    },
    [pushHistorySnapshot, showToast],
  );

  const handleReset = useCallback(async () => {
    if (!confirm('Reset room to default layout? Any custom items will be removed.')) return;
    pushHistorySnapshot(objectsRef.current);
    let defaults = DEFAULT_OBJECTS;
    try {
      const loaded = await loadRoomJSON(ROOM_MAP_URL);
      if (loaded.length > 0) defaults = loaded;
    } catch {
      /* keep default */
    }
    applyLayoutObjects(defaults);
    setSelectedId(null);
    nextIdRef.current = Math.max(...defaults.map((o) => o.id), 999) + 1;
    showToast('Room reset');
  }, [applyLayoutObjects, pushHistorySnapshot, showToast]);

  const handleTiledImport = useCallback(
    (json: unknown) => {
      if (!isValidTiledJson(json)) {
        showToast('Invalid Tiled map format');
        return;
      }
      try {
        const objects = loadTiledMap(json as Parameters<typeof loadTiledMap>[0]);
        if (objects.length === 0) {
          showToast('No furniture found in map');
          return;
        }
        pushHistorySnapshot(objectsRef.current);
        applyLayoutObjects(objects);
        nextIdRef.current = Math.max(...objects.map((o) => o.id), 999) + 1;
        setSelectedId(null);
        showToast(`Imported ${objects.length} items from Tiled map`);
      } catch {
        showToast('Failed to import Tiled map');
      }
    },
    [applyLayoutObjects, pushHistorySnapshot, showToast],
  );

  const handleShare = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const payload: SharedLayoutPayload = {
      v: 1,
      roomName,
      roomW,
      roomH,
      happiness,
      coins,
      floor,
      objects: objectsRef.current.map((o) => ({
        ...o,
        wx: Math.round(o.wx),
        wy: Math.round(o.wy),
      })),
    };

    const encoded = encodeBase64Url(JSON.stringify(payload));
    if (!encoded) {
      showToast('Share not available');
      return;
    }

    const shareUrl = `${window.location.origin}${window.location.pathname}?${LAYOUT_QUERY_PARAM}=${encoded}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Share link copied');
    } catch {
      const ok = window.prompt('Copy this lounge link', shareUrl);
      showToast(ok !== null ? 'Share link ready' : 'Could not copy link');
    }
  }, [coins, floor, happiness, roomH, roomName, roomW, showToast]);

  const handleFeed = useCallback(
    (item: FoodItem) => {
      if (coinsRef.current < item.cost) {
        showToast('Not enough coins');
        return;
      }
      const dormNow = dormRef.current;
      if (!dormNow) return;
      const fed = feedDorm(dormNow, item);
      if (fed.added <= 0) {
        showToast('Food gauge is full');
        return;
      }
      coinsRef.current -= item.cost;
      setCoins(coinsRef.current);
      dormRef.current = fed.state;
      setDorm(fed.state);
      showToast(`${item.icon} +${fed.added.toLocaleString()} 🍙`);
    },
    [showToast],
  );

  const handleFloorToggle = useCallback(() => {
    if (mode === 'move') {
      showToast('Finish editing first');
      return;
    }
    const currentLayout = cloneLayout(objectsRef.current);
    let nextLayout = inactiveFloorObjects;
    if (floor === 1 && nextLayout.length === 0) {
      // First visit to floor 2: seed the rest-floor starter layout.
      nextLayout = DEFAULT_FLOOR2_TEMPLATE.map((template) => ({
        ...template,
        id: nextIdRef.current++,
      }));
    }
    // Stations differ per floor — stop current activities so nobody re-plans
    // a route into the other floor's furniture.
    Object.values(officeWalkers).forEach((walker) => walker.clearAgentTask());
    setInactiveFloorObjects(currentLayout);
    applyLayoutObjects(nextLayout);
    setSelectedId(null);
    historyRef.current = [];
    redoRef.current = [];
    setFloor((f) => (f === 1 ? 2 : 1));
    showToast(floor === 1 ? 'Moved to Floor 2' : 'Moved to Floor 1');
  }, [applyLayoutObjects, floor, inactiveFloorObjects, mode, officeWalkers, showToast]);

  const selectedObj = objects.find((o) => o.id === selectedId) ?? null;
  const foodPct = Math.round((dorm.food / FOOD_CAP) * 100);
  const foodEtaLabel = formatSecondsHMS(foodDepletionSeconds(dorm.food, DORM_AGENT_IDS.length));
  const canUndo = historyRef.current.length > 0;
  const canRedo = redoRef.current.length > 0;
  const currentOfficeStep = officeSteps[officeStepIndex];
  const officeProgress =
    officeSteps.length > 0
      ? `${Math.min(officeStepIndex + 1, officeSteps.length)}/${officeSteps.length}`
      : '0/0';

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={viewportRef}
      className="relative flex-1 w-full overflow-hidden select-none"
      style={{
        height: 'calc(100vh - 45px)',
        minHeight: 'calc(100vh - 45px)',
        background: `linear-gradient(180deg,${theme.skyTop} 0%,${theme.skyBot} 100%)`,
        cursor: isPanning ? 'grabbing' : mode === 'visit' ? 'grab' : 'default',
      }}
      onWheel={handleWheel}
      onMouseDown={handlePanStart}
      onMouseMove={handlePanMove}
      onMouseUp={handlePanEnd}
      onMouseLeave={handlePanEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file) return;
        if (!file.name.endsWith('.json') && !file.name.endsWith('.tmj')) {
          showToast('Please drop a .json or .tmj Tiled Editor export.');
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const json = JSON.parse(reader.result as string);
            handleTiledImport(json);
          } catch {
            showToast('Invalid JSON file.');
          }
        };
        reader.onerror = () => showToast('Failed to read file.');
        reader.readAsText(file);
      }}
    >
      {/* ── Character ambient lighting overlay (theme-based tint) ────────── */}
      <div
        className="pointer-events-none absolute inset-0 z-25"
        style={{
          backgroundColor: `#${theme.wallTint.toString(16).padStart(6, '0')}`,
          opacity: theme.wallTintAlpha * 0.35,
          mixBlendMode: 'overlay' as React.CSSProperties['mixBlendMode'],
        }}
      />
      {/* ── Top-left: Back + Room name ───────────────────────────────── */}
      <div className="absolute left-3 top-3 z-30 flex items-center gap-2 max-sm:left-1 max-sm:top-1 max-sm:gap-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c8a870] bg-[#f5e4c0] text-[#5a3c18] shadow-md hover:bg-[#f0d8a8] active:scale-95 transition max-sm:h-8 max-sm:w-8 max-sm:text-[12px]"
        >
          ←
        </button>
        <div className="flex items-center gap-1.5 rounded-2xl border border-[#c8a870] bg-[#f5e4c0]/90 px-3 py-2 shadow-md backdrop-blur-sm max-sm:px-2 max-sm:py-1 max-sm:gap-1">
          {mode === 'move' ? (
            <input
              className="bg-transparent text-[13px] font-bold text-[#5a3c18] outline-none w-32 max-sm:w-20 max-sm:text-[11px]"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          ) : (
            <span className="text-[13px] font-bold text-[#5a3c18] max-sm:text-[11px]">
              {roomName}
            </span>
          )}
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'visit' ? 'move' : 'visit'))}
            className="text-[#8b5e30] hover:text-[#5a3c18] transition text-[12px] max-sm:text-[10px]"
          >
            ✏
          </button>
        </div>
      </div>

      {/* ── Top-right: combined stats bar ────────────────────────── */}
      <div className="absolute right-3 top-3 z-30 flex items-stretch rounded-2xl border border-[#c8a870] bg-[#f5e4c0]/90 shadow-md backdrop-blur-sm overflow-hidden max-sm:right-1 max-sm:top-1 max-sm:rounded-xl">
        <div
          className="flex items-center gap-1 px-2.5 py-1.5 max-sm:px-1.5 max-sm:py-1"
          title="Happiness"
        >
          <span className="text-[12px] leading-none max-sm:text-[10px]">😊</span>
          <span className="text-[11px] font-bold text-[#5a3c18] tabular-nums max-sm:text-[9px]">
            {happiness}
          </span>
        </div>
        <span className="my-1.5 w-px self-stretch bg-[#c8a870]/60" />
        <div
          className="flex items-center gap-1 px-2.5 py-1.5 max-sm:px-1.5 max-sm:py-1"
          title="Comfort — boosts dorm XP rate"
        >
          <span className="text-[12px] leading-none max-sm:text-[10px]">🛋️</span>
          <span className="text-[11px] font-bold text-[#5a3c18] tabular-nums max-sm:text-[9px]">
            {comfort}
          </span>
        </div>
        <span className="my-1.5 w-px self-stretch bg-[#c8a870]/60" />
        <div
          className="flex items-center gap-1 bg-[#fde68a]/70 px-2.5 py-1.5 max-sm:px-1.5 max-sm:py-1"
          title="Coins"
        >
          <span className="text-[12px] leading-none max-sm:text-[10px]">🪙</span>
          <span className="text-[11px] font-black text-[#7a5000] tabular-nums max-sm:text-[9px]">
            {coins.toLocaleString()}
          </span>
        </div>
        <span className="my-1.5 w-px self-stretch bg-[#c8a870]/60" />
        <div
          className="flex items-center gap-1 px-2.5 py-1.5 max-sm:px-1.5 max-sm:py-1"
          title="Decor tokens"
        >
          <span className="text-[12px] leading-none max-sm:text-[10px]">🎀</span>
          <span className="text-[11px] font-bold text-[#5a3c18] tabular-nums max-sm:text-[9px]">
            {tokens}
          </span>
        </div>
        <span className="my-1.5 w-px self-stretch bg-[#c8a870]/60" />
        <div
          className="flex items-center gap-1 px-2.5 py-1.5 max-sm:px-1.5 max-sm:py-1"
          title="Dorm food"
        >
          <span className="text-[11px] leading-none max-sm:text-[9px]">🍱</span>
          <span className="text-[10px] font-mono font-bold text-[#5a3c18] tabular-nums max-sm:text-[8px]">
            {foodPct}%
          </span>
          {dorm.food === 0 && (
            <span className="text-[7px] font-black text-[#991b1b] bg-[#fecaca] rounded-full px-1 py-px animate-pulse max-sm:text-[6px]">
              Empty
            </span>
          )}
        </div>
      </div>

      {/* ── Office workflow command board ────────────────────────── */}
      <div className="absolute left-3 top-16 z-30 flex w-[340px] max-w-[calc(100vw-1.5rem)] flex-col gap-2 rounded-2xl border border-[#c8a870] bg-[#f5e4c0]/95 p-3 shadow-xl backdrop-blur-sm max-sm:left-1 max-sm:right-1 max-sm:top-[4.25rem] max-sm:w-auto max-sm:gap-1.5 max-sm:p-2">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-black text-[#5a3c18] max-sm:text-[10px]">
            Command Board
          </span>
          <button
            type="button"
            onClick={handleToggleAutonomousMode}
            aria-pressed={autonomousMode}
            title="Auto-restart: start a new mission after each run (calls the LLM planner every cycle)"
            className={`rounded-full border px-2 py-0.5 text-[9px] font-black shadow-sm transition active:scale-95 max-sm:text-[7px] ${
              autonomousMode
                ? 'border-[#15803d] bg-[#15803d] text-white hover:bg-[#166534]'
                : 'border-[#c8a870] bg-[#fff8e8] text-[#5a3c18] hover:bg-[#fde68a]'
            }`}
          >
            {/* Stable accessible name "Auto"; aria-pressed carries the state. */}
            Auto <span aria-hidden="true">{autonomousMode ? 'on' : 'off'}</span>
          </button>
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-black max-sm:text-[7px] ${OFFICE_STATUS_CLASS[officeStatus]}`}
          >
            {OFFICE_STATUS_LABEL[officeStatus]} · {officeProgress}
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-1">
          <input
            value={officeCommand}
            onChange={(e) => setOfficeCommand(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-[#c8a870]/70 bg-white/80 px-2 py-1.5 text-[11px] font-semibold text-[#5a3c18] outline-none focus:border-[#38bdf8] max-sm:text-[9px]"
            aria-label="Office command"
          />
          <button
            type="button"
            onClick={() => void handleRunOfficeCommand()}
            disabled={officeStatus === 'running' || !roomReady}
            title="Run office workflow"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[12px] font-black shadow active:scale-95 transition ${
              officeStatus === 'running' || !roomReady
                ? 'bg-[#94a3b8] text-[#334155] cursor-not-allowed'
                : 'bg-[#16a34a] text-white hover:bg-[#15803d]'
            }`}
          >
            ▶
          </button>
          <button
            type="button"
            onClick={handlePauseOfficeWorkflow}
            disabled={officeStatus !== 'running' && officeStatus !== 'paused'}
            title={officeStatus === 'paused' ? 'Resume' : 'Pause'}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[12px] font-black shadow active:scale-95 transition ${
              officeStatus === 'running' || officeStatus === 'paused'
                ? 'bg-[#fde68a] text-[#7a5000] hover:bg-[#facc15]'
                : 'bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed'
            }`}
          >
            {officeStatus === 'paused' ? '▶' : 'Ⅱ'}
          </button>
          <button
            type="button"
            onClick={handleResetOfficeWorkflow}
            title="Reset office workflow"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#fee2e2] text-[12px] font-black text-[#991b1b] shadow hover:bg-[#fecaca] active:scale-95 transition"
          >
            ↻
          </button>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {visibleOfficeAgents.map(({ spec, agent: boardAgent }) => {
            const active = currentOfficeStep?.agentId === spec.id;
            return (
              <div
                key={spec.id}
                title={`${spec.title} · ${spec.focus}`}
                className={`min-w-0 rounded-xl border px-1.5 py-1 text-center ${
                  active ? 'border-[#38bdf8] bg-[#e0f2fe]' : 'border-[#c8a870]/70 bg-[#fff8e8]/70'
                }`}
              >
                <Image
                  src={`/characters/${spec.characterId}/01-idle.jpg`}
                  alt={spec.name}
                  width={24}
                  height={24}
                  className="mx-auto h-6 w-6 rounded-full object-cover"
                  unoptimized
                />
                <div className="mt-0.5 truncate text-[8px] font-black text-[#5a3c18]">
                  {spec.name}
                </div>
                <div className="truncate text-[7px] font-bold text-[#8b6030]">
                  {TASK_ICON[boardAgent.taskType ?? 'idle'] ?? '·'}{' '}
                  {TASK_ICON_LABEL[boardAgent.taskType ?? 'idle']}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex min-w-0 items-center gap-1 overflow-hidden">
          {officeSteps.map((step, index) => (
            <span
              key={step.id}
              title={step.detail}
              className={`min-w-0 flex-1 truncate rounded-full px-1.5 py-0.5 text-center text-[8px] font-black ${
                index < officeStepIndex
                  ? 'bg-[#bbf7d0] text-[#166534]'
                  : index === officeStepIndex
                    ? 'bg-[#bfdbfe] text-[#1e40af]'
                    : 'bg-[#e8d0a0]/70 text-[#7a5000]'
              }`}
            >
              {step.title}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-[1.15fr_0.85fr] gap-2 max-sm:grid-cols-1 max-sm:gap-1.5">
          <div className="min-h-[82px] rounded-xl border border-[#c8a870]/70 bg-white/60 p-1.5">
            <div className="mb-1 text-[8px] font-black uppercase tracking-wide text-[#8b6030]">
              Agent Chat
            </div>
            <div className="flex max-h-[92px] flex-col gap-1 overflow-hidden">
              {officeChat.length === 0 ? (
                <div className="rounded-lg border border-[#c8a870]/40 bg-[#fff8e8]/80 px-2 py-1 text-[9px] font-semibold text-[#8b6030]">
                  Ready
                </div>
              ) : (
                officeChat.map((message) => {
                  const speaker = OFFICE_WORKFLOW_AGENTS.find(
                    (item) => item.id === message.agentId,
                  );
                  const target = message.toAgentId
                    ? OFFICE_WORKFLOW_AGENTS.find((item) => item.id === message.toAgentId)
                    : null;
                  return (
                    <div
                      key={message.id}
                      className={`rounded-lg border px-2 py-1 text-[8px] font-semibold leading-snug ${OFFICE_CHAT_CLASS[message.kind]}`}
                    >
                      <span className="font-black">
                        {speaker?.name ?? message.agentId}
                        {target ? ` → ${target.name}` : ''}
                      </span>
                      <span className="ml-1">{message.text}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="min-h-[82px] rounded-xl border border-[#c8a870]/70 bg-white/60 p-1.5">
            <div className="mb-1 text-[8px] font-black uppercase tracking-wide text-[#8b6030]">
              Tool Boundary
            </div>
            <div className="mb-1 flex flex-wrap gap-1">
              {Object.entries(OFFICE_TOOL_BOUNDARIES).map(([toolId, tool]) => (
                <span
                  key={toolId}
                  title={tool.guardrail}
                  className="rounded-full bg-[#f5e4c0] px-1.5 py-0.5 text-[7px] font-black text-[#5a3c18]"
                >
                  {tool.label}
                </span>
              ))}
            </div>
            <div className="flex max-h-[64px] flex-col gap-1 overflow-hidden">
              {officeToolEvents.length === 0 ? (
                <div className="rounded-lg border border-[#c8a870]/40 bg-[#fff8e8]/80 px-2 py-1 text-[9px] font-semibold text-[#8b6030]">
                  Awaiting run
                </div>
              ) : (
                officeToolEvents.slice(-3).map((event) => {
                  const owner = OFFICE_WORKFLOW_AGENTS.find((item) => item.id === event.agentId);
                  return (
                    <div
                      key={event.id}
                      className="rounded-lg border border-[#bbf7d0]/70 bg-[#f0fdf4]/85 px-2 py-1 text-[8px] font-semibold leading-snug text-[#166534]"
                    >
                      <span className="font-black">{event.label}</span>
                      <span className="ml-1">
                        {owner?.name ?? event.agentId}: {event.detail}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Move-mode banner ────────────────────────────────────────── */}
      {mode === 'move' && (
        <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-[#e8b800] bg-[#fde68a] px-3 py-1 shadow-md max-sm:flex-wrap max-sm:justify-center max-sm:gap-1 max-sm:px-2 max-sm:py-0.5 max-sm:rounded-2xl">
          <span className="text-[10px] font-black text-[#7a5000] max-sm:text-[8px]">
            ✋ Move Mode
          </span>
          <button
            type="button"
            onClick={handleAutoArrange}
            className="rounded-full bg-[#2563eb] px-2 py-0.5 text-[9px] font-black text-white hover:bg-[#1d4ed8] active:scale-95 transition max-sm:px-1.5 max-sm:text-[7px]"
          >
            ✦ Auto
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className={`rounded-full px-2 py-0.5 text-[9px] font-black active:scale-95 transition max-sm:px-1.5 max-sm:text-[7px] ${canUndo ? 'bg-[#166534] text-white hover:bg-[#14532d]' : 'bg-[#94a3b8] text-[#334155] cursor-not-allowed'}`}
          >
            ↶ Undo
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            className={`rounded-full px-2 py-0.5 text-[9px] font-black active:scale-95 transition max-sm:px-1.5 max-sm:text-[7px] ${canRedo ? 'bg-[#7c3aed] text-white hover:bg-[#6d28d9]' : 'bg-[#94a3b8] text-[#334155] cursor-not-allowed'}`}
          >
            ↷ Redo
          </button>
          <button
            type="button"
            onClick={() => setShowRoomSettings((s) => !s)}
            className="rounded-full bg-[#7a5000] px-2 py-0.5 text-[9px] font-black text-[#fde68a] hover:bg-[#5a3800] active:scale-95 transition max-sm:px-1.5 max-sm:text-[7px]"
          >
            ⚙ Room
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full bg-[#e84040] px-2 py-0.5 text-[9px] font-black text-white hover:bg-[#d03030] active:scale-95 transition max-sm:px-1.5 max-sm:text-[7px]"
          >
            ↻ Reset
          </button>
        </div>
      )}

      {/* ── Room settings panel ─────────────────────────────────────── */}
      {mode === 'move' && showRoomSettings && (
        <div className="absolute left-1/2 top-14 z-40 -translate-x-1/2 rounded-2xl border border-[#c8a870] bg-[#f5e4c0]/95 px-5 py-3 shadow-xl backdrop-blur-sm flex flex-col gap-2 min-w-[220px]">
          <span className="text-[11px] font-black text-[#5a3c18]">Room Size</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#7a5000] w-12">Width</span>
            <input
              type="range"
              min={6}
              max={16}
              value={roomW}
              onChange={(e) => setRoomW(Number(e.target.value))}
              className="flex-1 accent-[#e8b800]"
            />
            <span className="text-[11px] font-bold text-[#5a3c18] w-6 text-center">{roomW}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#7a5000] w-12">Height</span>
            <input
              type="range"
              min={5}
              max={14}
              value={roomH}
              onChange={(e) => setRoomH(Number(e.target.value))}
              className="flex-1 accent-[#e8b800]"
            />
            <span className="text-[11px] font-bold text-[#5a3c18] w-6 text-center">{roomH}</span>
          </div>
          <span className="text-[9px] text-[#8b5e30] text-center">
            {roomW} × {roomH} tiles — saved automatically
          </span>
          <span className="mt-1 text-[11px] font-black text-[#5a3c18]">Wallpaper</span>
          <div className="flex flex-wrap items-center gap-1">
            {(['auto', ...ROOM_THEME_KEYS] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setThemeKey(key)}
                className={`rounded-full px-2 py-0.5 text-[9px] font-black capitalize active:scale-95 transition ${
                  themeKey === key
                    ? 'bg-[#e8a030] text-white shadow'
                    : 'bg-[#e8d0a0]/60 text-[#7a5000] hover:bg-[#e8d0a0]'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`absolute left-1/2 z-40 -translate-x-1/2 rounded-full bg-[#fdf6e8] border border-[#c8a870] px-4 py-1.5 shadow-lg animate-pulse max-sm:px-3 max-sm:py-1 ${mode === 'move' ? 'top-20 max-sm:top-24' : 'top-16 max-sm:top-14'}`}
        >
          <span className="text-[11px] font-black text-[#5a3c18] max-sm:text-[9px]">{toast}</span>
        </div>
      )}

      {/* ── Room canvas ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `translate(${panX}px, ${panY + cameraY}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="absolute inset-0" />

          <div className="absolute inset-0 z-30 pointer-events-none">
            {mode === 'move' && routeDebug.points.length > 0 && (
              <svg
                className="absolute inset-0 z-[1] h-full w-full"
                viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                aria-hidden="true"
              >
                {(() => {
                  const remaining = routeDebug.points.slice(routeDebug.activeIndex);
                  const points = [agent.position, ...remaining.map((point) => point.position)];
                  return (
                    <>
                      <polyline
                        points={points.map((point) => `${point.x},${point.y}`).join(' ')}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth={4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeOpacity={0.72}
                        strokeDasharray="8 9"
                      />
                      {remaining.map((point, index) => (
                        <g key={`${point.cell.x}-${point.cell.y}-${index}`}>
                          <circle
                            cx={point.position.x}
                            cy={point.position.y}
                            r={index === remaining.length - 1 ? 5 : 3.5}
                            fill={index === remaining.length - 1 ? '#facc15' : '#e0f2fe'}
                            fillOpacity={0.92}
                            stroke="#075985"
                            strokeWidth={1.5}
                            strokeOpacity={0.8}
                          />
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            )}

            {/* ── Ambient chatter bubble near agent-1 ──────────────────── */}
            {agentBubble && visibleOfficeAgents.length > 0 && (
              <AgentBubble
                text={agentBubble}
                left={visibleOfficeAgents[0]!.agent.position.x}
                top={visibleOfficeAgents[0]!.agent.position.y - 65}
                variant="ambient"
                className="animate-bounce z-50"
              />
            )}

            {/* ── Lounge agents walking overlay ─────────────────────── */}
            {visibleOfficeAgents.map(({ spec, agent: a }) => {
              const ANIM_FILE: Record<string, string> = {
                idle: '01-idle',
                walk_up: '04-thinking',
                walk_down: '04-thinking',
                walk_left: '04-thinking',
                walk_right: '04-thinking',
                thinking: '04-thinking',
                typing: '08-excited',
                reading: '04-thinking',
                talking: '05-happy',
                documenting: '08-excited',
                printing: '08-excited',
                resting: '07-sleepy',
                happy: '05-happy',
                confused: '09-surprised',
              };
              const moodFile = ANIM_FILE[a.animation] ?? '01-idle';
              const imgSrc = `/characters/${a.characterId}/${moodFile}.jpg`;
              const { x, y } = a.position;
              const hasSpineAsset = hasOfficeAgentSpineAsset(spec.id);
              const spineStatus = spineLoadStatus[spec.id];
              const showAvatarFallback = shouldShowHtmlAgentAvatar({
                hasSpineAsset,
                spineStatus,
              });
              const overlayLayout = getAgentOverlayLayout(hasSpineAsset);
              const SZ = overlayLayout.avatarSize;
              return (
                <div
                  key={a.id}
                  className="absolute"
                  style={{ left: x, top: y, transform: 'translate(-50%, -100%)' }}
                  data-agent-id={a.id}
                  data-agent-spine-status={spineStatus ?? 'none'}
                  data-agent-avatar-fallback={showAvatarFallback ? 'true' : 'false'}
                >
                  {a.bubbleText && (
                    <AgentBubble
                      text={a.bubbleText}
                      left={0}
                      top={-65}
                      variant="agent"
                    />
                  )}
                  {activeDialogueBubble && a.id === activeDialogueBubble.agentId && (
                    <AgentBubble
                      text={`${a.name}/${activeDialogueBubble.text}`}
                      left={0}
                      top={-100}
                      variant="dialogue"
                    />
                  )}
                  {showAvatarFallback && (
                    <div
                      className="absolute z-10"
                      style={{
                        left: x,
                        top: y,
                        transform: 'translate(-50%, -100%)',
                        width: SZ,
                        height: SZ,
                      }}
                    >
                      <Image
                        src={imgSrc}
                        alt={a.name}
                        width={SZ}
                        height={SZ}
                        className="rounded-full border-2 border-white shadow-md object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <FurnitureInspector
            object={selectedObj}
            onClose={() => setSelectedId(null)}
            onMoveMode={() => setMode('move')}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* ── Agent task buttons ───────────────────────────────────── */}
      <div className="absolute bottom-2 left-1/2 z-40 -translate-x-1/2 flex flex-col items-center gap-0.5 max-sm:bottom-14">
        <div className="flex items-center gap-0.5 rounded-2xl border border-[#c8a870] bg-[#f5e4c0]/95 px-2 py-1.5 shadow-lg backdrop-blur-sm max-sm:px-1 max-sm:py-1">
          {TASK_DEFS.map(({ task, icon, label }) => (
            <button
              key={task}
              type="button"
              onClick={(e) => (e.shiftKey ? enqueueTask(task) : assignTask(task))}
              title={`${label} — shift-click to enqueue`}
              className={`flex flex-col items-center gap-0 rounded-xl px-2 py-1 text-[10px] font-bold transition active:scale-95 max-sm:px-1 max-sm:py-0.5 max-sm:text-[8px] ${
                agent.taskType === task && agent.state !== 'idle'
                  ? 'bg-[#e8a030] text-white shadow ring-2 ring-[#e8a030]/40'
                  : 'text-[#5a3c18] hover:bg-[#f0d8a8]'
              }`}
            >
              <span className="text-[15px] leading-none max-sm:text-[13px]">{icon}</span>
              <span className="leading-none mt-0.5 max-sm:mt-0">{label}</span>
            </button>
          ))}
          {agent.state !== 'idle' && (
            <button
              type="button"
              onClick={clearAgentTask}
              className={`ml-0.5 rounded-xl px-2 py-1 text-[11px] font-bold active:scale-95 transition ${
                agent.state === 'error'
                  ? 'bg-[#fca5a5]/60 text-[#7f1d1d] ring-1 ring-[#991b1b]/40 hover:bg-[#fca5a5]/80'
                  : 'text-[#9a3c18] hover:bg-[#fdd]'
              }`}
              title="Stop agent and clear queue"
            >
              {agent.state === 'error' ? (
                <>
                  ✕<span className="ml-1 max-sm:hidden">Clear</span>
                </>
              ) : (
                '✕'
              )}
            </button>
          )}
        </div>
        {agent.state === 'error' && (
          <span className="text-[8px] font-semibold text-[#991b1b]/70 max-sm:hidden">
            ✕ to clear
          </span>
        )}
        {agent.taskQueue.length > 0 && (
          <div className="flex items-center gap-1 rounded-full border border-[#c8a870] bg-[#f5e4c0]/90 px-2 py-0.5 shadow-sm max-sm:px-1.5">
            <span className="text-[8px] font-bold text-[#7a5000] tracking-wide">Next:</span>
            <span title={TASK_ICON_LABEL[agent.taskQueue[0]!]} className="text-[11px] leading-none">
              {TASK_ICON[agent.taskQueue[0]!] ?? '·'}
            </span>
            <span className="text-[8px] font-semibold text-[#5a3c18] max-sm:hidden">
              {TASK_ICON_LABEL[agent.taskQueue[0]!]}
            </span>
            {agent.taskQueue.length > 1 && (
              <span className="text-[8px] text-[#8b6030]">+{agent.taskQueue.length - 1}</span>
            )}
            <button
              type="button"
              onClick={clearQueue}
              title="Clear queue"
              className="ml-0.5 text-[10px] font-bold text-[#9a3c18] hover:text-[#7a2c08] active:scale-95 transition"
            >
              ✕
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setSupplyOpen(true)}
          title="Feed the dorm"
          className="rounded-full bg-[#ff69b4]/15 border border-[#ff69b4]/30 px-2.5 py-0.5 text-[9px] font-bold text-[#d4708a] hover:bg-[#ff69b4]/25 active:scale-95 transition max-sm:px-2 max-sm:text-[8px]"
        >
          🍱 Feed
        </button>

        {/* Character roster cards */}
        <div className="mt-1 flex max-w-[92vw] flex-wrap items-center justify-center gap-1.5 max-sm:mt-0.5 max-sm:max-w-[96vw] max-sm:gap-1">
          {visibleOfficeAgents.map(({ spec, agent: rosterAgent }) => (
            <div
              key={spec.id}
              className={`flex min-w-0 items-center gap-1.5 rounded-xl border px-2 py-1 max-sm:px-1.5 max-sm:py-0.5 max-sm:gap-1 ${
                officeSteps[officeStepIndex]?.agentId === spec.id && officeStatus === 'running'
                  ? 'border-[#38bdf8] bg-[#e0f2fe]/95'
                  : 'border-[#c8a870] bg-[#f5e4c0]/90'
              }`}
            >
              <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-[#fff0f5] max-sm:h-5 max-sm:w-5">
                <Image
                  src={`/characters/${spec.characterId}/01-idle.jpg`}
                  alt={spec.name}
                  width={28}
                  height={28}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
              <span className="truncate text-[10px] font-bold text-[#5a3c18] max-sm:text-[8px]">
                {spec.name}
              </span>
              {(() => {
                const stats = dorm.characters[spec.id];
                if (!stats) return null;
                return (
                  <span
                    className="flex shrink-0 items-center gap-1 text-[8px] font-bold text-[#7a5000] tabular-nums max-sm:text-[7px]"
                    title={`Lv ${stats.level} · Morale ${Math.round(stats.morale)}/150 · Affection ${Math.floor(stats.affection)}/100`}
                  >
                    <span className="rounded-full bg-[#fde68a]/80 px-1 py-px">Lv{stats.level}</span>
                    <span>{MORALE_EMOJI[moraleBand(stats.morale)]}</span>
                    <span className="text-[#d4708a]">♥{Math.floor(stats.affection)}</span>
                  </span>
                );
              })()}
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold max-sm:px-1.5 max-sm:text-[7px] ${STATE_COLOR[rosterAgent.state] ?? 'bg-[#e8d0a0]/30 text-[#5a3c18]'}`}
              >
                {STATE_LABEL[rosterAgent.state] ?? rosterAgent.state}
              </span>
            </div>
          ))}
        </div>
        {agent.state === 'error' && agent.bubbleText && (
          <span className="flex items-center gap-1 rounded-full border border-[#991b1b]/30 bg-[#fca5a5]/40 px-2 py-0.5 text-[8px] font-semibold text-[#991b1b] max-sm:text-[7px]">
            <span aria-hidden>⚠️</span>
            {agent.bubbleText}
          </span>
        )}
        {agent.workDurationMs !== undefined && agent.workElapsedMs !== undefined && (
          <div className="flex flex-col items-center gap-0.5 mt-0.5">
            <span className="text-[8px] font-semibold text-[#7a5000]/70 max-sm:text-[7px]">
              Working ·{' '}
              {Math.max(1, Math.ceil((agent.workDurationMs - agent.workElapsedMs) / 1000))}s left
            </span>
            <div className="relative h-1 w-32 overflow-hidden rounded-full bg-[#e8d0a0]">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[#e8a030]"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, (agent.workElapsedMs / agent.workDurationMs) * 100),
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom-left: Train + Supplies ───────────────────────────── */}
      <div className="absolute left-2 bottom-2 z-30 flex flex-col gap-1 max-sm:left-1 max-sm:bottom-1 max-sm:gap-0.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleTrain}
            disabled={trainCount >= TRAIN_MAX}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-white shadow-md active:scale-95 transition ${
              trainCount >= TRAIN_MAX
                ? 'bg-[#a0a0a0] cursor-not-allowed'
                : 'bg-[#e84040] hover:bg-[#d03030]'
            }`}
          >
            <span className="text-[11px] font-black">Train</span>
            <span className="text-[10px] font-bold opacity-90 tabular-nums">
              {trainCount}/{TRAIN_MAX}
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setSupplyOpen(true)}
          title="Open dorm supplies"
          className="rounded-xl border border-[#c8a870] bg-[#f5e4c0]/90 px-2.5 py-1.5 shadow-md backdrop-blur-sm min-w-[168px] text-left hover:bg-[#f0d8a8] active:scale-[0.98] transition"
        >
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px]">🍱</span>
            <span className="text-[9px] font-bold text-[#5a3c18]">Food</span>
            <span className="ml-auto text-[9px] font-mono font-bold text-[#2a7a30] tabular-nums">
              {dorm.food > 0 ? foodEtaLabel : 'Empty!'}
            </span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[#e8d0a0]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[#e84040] transition-all"
              style={{ width: `${foodPct}%` }}
            />
          </div>
          <div className="mt-0.5 text-right text-[8px] font-bold text-[#5a3c18] tabular-nums">
            {Math.round(dorm.food).toLocaleString()}/{FOOD_CAP.toLocaleString()}
          </div>
        </button>

        {/* Speech bubble — moved to overlay near agent-1 (Mai) */}
        {/* Floating hearts */}
        {floatingHearts.map((h) => (
          <div
            key={h.id}
            className="absolute pointer-events-none text-lg animate-ping z-50"
            style={{ left: h.x + '%', top: h.y + '%', animation: 'floatUp 1.5s ease-out forwards' }}
          >
            💕
          </div>
        ))}
      </div>

      {/* ── Bottom-right: Action dock ──────────────────────────────── */}
      <div className="absolute right-2 bottom-2 z-30 flex items-center gap-1 max-sm:right-1 max-sm:bottom-1 max-sm:gap-0.5">
        <button
          type="button"
          onClick={() => setMode((m) => (m === 'visit' ? 'move' : 'visit'))}
          title={mode === 'move' ? 'Done editing' : 'Move furniture'}
          className={`flex flex-col items-center justify-center gap-0 rounded-xl border px-2.5 py-1.5 shadow-md active:scale-95 transition min-w-[54px] max-sm:min-w-[44px] max-sm:px-2 max-sm:py-1 ${mode === 'move' ? 'border-[#e8b800] bg-[#fde68a] text-[#7a5000]' : 'border-[#c8a870] bg-[#f5e4c0]/90 text-[#5a3c18] hover:bg-[#f0d8a8]'}`}
        >
          <span className="text-[18px] leading-none max-sm:text-[16px]">🪑</span>
          <span className="text-[9px] font-bold mt-0.5 max-sm:text-[7px]">
            {mode === 'move' ? 'Done' : 'Move'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setShopOpen(true)}
          title="Shop"
          className="flex flex-col items-center justify-center gap-0 rounded-xl border border-[#e89830] bg-[#fad090]/90 px-2.5 py-1.5 shadow-md hover:bg-[#fac070] active:scale-95 transition min-w-[54px] max-sm:min-w-[44px] max-sm:px-2 max-sm:py-1"
        >
          <span className="text-[18px] leading-none max-sm:text-[16px]">🏪</span>
          <span className="text-[9px] font-bold text-[#7a4000] mt-0.5 max-sm:text-[7px]">Shop</span>
        </button>
        <TiledMapImporter
          onImport={handleTiledImport}
          onError={(msg: string) => showToast(msg)}
        />
        <button
          type="button"
          onClick={handleShare}
          title="Share lounge link"
          className="flex flex-col items-center justify-center gap-0 rounded-xl border border-[#4a8acc] bg-[#b8d8f0]/90 px-2.5 py-1.5 shadow-md hover:bg-[#a0c8e8] active:scale-95 transition min-w-[54px] max-sm:min-w-[44px] max-sm:px-2 max-sm:py-1"
        >
          <span className="text-[18px] leading-none max-sm:text-[16px]">☁️</span>
          <span className="text-[9px] font-bold text-[#1a4870] mt-0.5 max-sm:text-[7px]">
            Share
          </span>
        </button>
        <button
          type="button"
          onClick={handleFloorToggle}
          title={`Go to floor ${floor === 1 ? 2 : 1}`}
          className="flex flex-col items-center justify-center gap-0 rounded-xl border border-[#c8a870] bg-[#f5e4c0]/90 px-2.5 py-1.5 shadow-md hover:bg-[#f0d8a8] active:scale-95 transition min-w-[54px] max-sm:min-w-[44px] max-sm:px-2 max-sm:py-1"
        >
          <span className="text-[18px] leading-none max-sm:text-[16px]">🪜</span>
          <span className="text-[9px] font-bold text-[#5a3c18] mt-0.5 max-sm:text-[7px]">
            Floor {floor}
          </span>
        </button>
      </div>

      {/* ── Shop modal ─────────────────────────────────────────────── */}
      <ShopModal
        open={shopOpen}
        coins={coins}
        tokens={tokens}
        onClose={() => setShopOpen(false)}
        onPurchase={(item) => handlePurchase(item)}
      />

      {/* ── Dorm supply panel ──────────────────────────────────────── */}
      <SupplyPanel
        open={supplyOpen}
        coins={coins}
        food={dorm.food}
        depletionLabel={foodEtaLabel}
        onClose={() => setSupplyOpen(false)}
        onFeed={handleFeed}
      />
    </div>
  );
}
