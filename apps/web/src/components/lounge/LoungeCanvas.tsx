"use client";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as PIXI from "pixi.js";
import "pixi-spine";
import { Spine } from "pixi-spine";
import {
  drawBackground,
  proj,
  worldDeltaFromScreen,
  DEFAULT_OBJECTS,
  CANVAS_W,
  CANVAS_H,
  ROOM_TILES_X,
  ROOM_TILES_Y,
  setRoomProjection,
  getTimeTheme,
} from "./pixiRoom";
import type { RoomTheme } from "./pixiRoom";
import { buildRoomScene, loadRoomJSON } from "./roomLoader";
import type { RoomScene } from "./roomLoader";
import type { RoomObject } from "./roomDefs";
import { checkCollision, FURNITURE_TILES } from "./roomDefs";
import { FurnitureInspector } from "./FurnitureInspector";
import { ShopModal } from "./ShopModal";
import { getDefaultSpawnPosition, type CatalogItem } from "./furnitureCatalog";
import { selectPurchasePlacement } from "./purchasePlacement";
import { useAgentWalk } from "@/hooks/useAgentWalk";
import { useCountdown } from "@/hooks/useCountdown";
import type { AgentState, AgentTaskType } from "@/game/agents/agentTypes";
import { loungeStations, type LoungeStationId } from "@/game/scene/loungeStations";
import Image from "next/image";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function snapObj(
  o: RoomObject,
  maxX = ROOM_TILES_X,
  maxY = ROOM_TILES_Y,
): RoomObject {
  return {
    ...o,
    wx: Math.round(Math.max(0, Math.min(maxX - 1, o.wx))),
    wy: Math.min(maxY, Math.round(Math.max(0, o.wy))),
  };
}

function cloneLayout(objects: RoomObject[]): RoomObject[] {
  return objects.map((o) => ({ ...o }));
}

function autoArrangeLayout(
  objects: RoomObject[],
  maxW: number,
  maxH: number,
): RoomObject[] | null {
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
  { task: "code",     icon: "💻",  label: "Code"  },
  { task: "research", icon: "📚",  label: "Read"  },
  { task: "meeting",  icon: "🗣️", label: "Meet"  },
  { task: "document", icon: "📝",  label: "Doc"   },
  { task: "print",    icon: "🖨️", label: "Print" },
  { task: "rest",     icon: "🛋️", label: "Rest"  },
];

const TASK_ICON: Record<AgentTaskType, string> = {
  code:     "💻",
  research: "📚",
  meeting:  "🗣️",
  document: "📝",
  review:   "🔍",
  print:    "🖨️",
  rest:     "🛋️",
  idle:     "·",
};

const TASK_ICON_LABEL: Record<AgentTaskType, string> = {
  code:     "Code",
  research: "Read",
  meeting:  "Meet",
  document: "Doc",
  review:   "Review",
  print:    "Print",
  rest:     "Rest",
  idle:     "Idle",
};

const TASK_REWARDS: Record<AgentTaskType, { coins: number; happiness: number }> = {
  code:     { coins: 40, happiness: 8 },
  research: { coins: 25, happiness: 5 },
  document: { coins: 20, happiness: 4 },
  meeting:  { coins: 20, happiness: 4 },
  review:   { coins: 30, happiness: 6 },
  print:    { coins: 15, happiness: 3 },
  rest:     { coins: 10, happiness: 10 },
  idle:     { coins: 0,  happiness: 0 },
};

const STATE_LABEL: Record<string, string> = {
  idle:        "😴 Idle",
  walking:     "🚶 Moving",
  thinking:    "🤔 Thinking",
  coding:      "💻 Coding",
  researching: "📚 Reading",
  meeting:     "🗣️ Meeting",
  documenting: "📝 Docs",
  reviewing:   "🔍 Review",
  printing:    "🖨️ Print",
  resting:     "🛋️ Resting",
  done:        "✅ Done",
  error:       "⚠️ Error",
};

const STATE_COLOR: Record<string, string> = {
  idle:        "bg-[#86efac]/30 text-[#166534]",
  walking:     "bg-[#93c5fd]/30 text-[#1e40af]",
  thinking:    "bg-[#c4b5fd]/30 text-[#5b21b6]",
  coding:      "bg-[#fde68a]/40 text-[#7a5000]",
  researching: "bg-[#a5f3fc]/30 text-[#155e75]",
  meeting:     "bg-[#f9a8d4]/30 text-[#831843]",
  documenting: "bg-[#d9f99d]/30 text-[#3f6212]",
  reviewing:   "bg-[#fca5a5]/30 text-[#7f1d1d]",
  printing:    "bg-[#e9d5ff]/30 text-[#4c1d95]",
  resting:     "bg-[#fed7aa]/30 text-[#7c2d12]",
  done:        "bg-[#86efac]/40 text-[#14532d]",
  error:       "bg-[#fca5a5]/50 text-[#991b1b]",
};

const STORAGE_KEY = "squad:lounge:v7";
const ROOM_MAP_URL = "/maps/maple_hideout.json";
const INITIAL_COINS = 500;
const TRAIN_REWARD = 25;
const COLLECT_BUTTON_COOLDOWN_MS = 8000;

type Mode = "visit" | "move";

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

const LAYOUT_QUERY_PARAM = "layout";

function useTimer(startSecs = 8 * 3600 + 23 * 60 + 17) {
  const [s, setS] = useState(startSecs);
  useEffect(() => {
    const id = setInterval(() => setS((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${ss}`;
}

function useSuppliesTimer(startSecs = 12 * 3600 + 45 * 60 + 30) {
  const [s, setS] = useState(startSecs);
  useEffect(() => {
    const id = setInterval(() => setS((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${ss}`;
}

function encodeBase64Url(input: string): string {
  if (typeof window === "undefined") return "";
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(input: string): string | null {
  if (typeof window === "undefined") return null;
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function parseSharedLayoutFromUrl(): SharedLayoutPayload | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get(LAYOUT_QUERY_PARAM);
  if (!encoded) return null;

  const decoded = decodeBase64Url(encoded);
  if (!decoded) return null;

  try {
    const parsed = JSON.parse(decoded) as Partial<SharedLayoutPayload>;
    if (parsed.v !== 1 || !Array.isArray(parsed.objects)) return null;

    const roomW =
      typeof parsed.roomW === "number"
        ? Math.max(6, Math.min(16, parsed.roomW))
        : ROOM_TILES_X;
    const roomH =
      typeof parsed.roomH === "number"
        ? Math.max(5, Math.min(14, parsed.roomH))
        : ROOM_TILES_Y;

    const objects = parsed.objects
      .filter((o): o is RoomObject => {
        return (
          typeof o?.id === "number" &&
          typeof o?.furnitureType === "string" &&
          typeof o?.label === "string" &&
          typeof o?.description === "string" &&
          typeof o?.wx === "number" &&
          typeof o?.wy === "number" &&
          typeof o?.wz === "number" &&
          typeof o?.happiness === "number" &&
          typeof o?.draggable === "boolean"
        );
      })
      .map((o) => snapObj(o, roomW, roomH));

    if (objects.length === 0) return null;

    return {
      v: 1,
      roomName:
        typeof parsed.roomName === "string" && parsed.roomName.trim().length > 0
          ? parsed.roomName
          : "Shared Lounge",
      roomW,
      roomH,
      happiness: typeof parsed.happiness === "number" ? parsed.happiness : 128,
      coins:
        typeof parsed.coins === "number"
          ? Math.max(0, parsed.coins)
          : INITIAL_COINS,
      floor: parsed.floor === 2 ? 2 : 1,
      objects,
    };
  } catch {
    return null;
  }
}

function removeSharedLayoutQuery(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(LAYOUT_QUERY_PARAM)) return;
  url.searchParams.delete(LAYOUT_QUERY_PARAM);
  const qs = url.searchParams.toString();
  const next = `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`;
  window.history.replaceState({}, "", next);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LoungeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const sceneRef = useRef<RoomScene | null>(null);
  const charSpritesRef = useRef<Map<string, PIXI.Container>>(new Map());
  const lastCollectRef = useRef<Record<string, number>>({});
  const lastCooldownToastRef = useRef(0);
  const collectButtonCooldownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{
    id: number;
    screenX: number;
    screenY: number;
    accX: number;
    accY: number;
    lastValidX: number;
    lastValidY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const objectsRef = useRef<RoomObject[]>(DEFAULT_OBJECTS);
  const historyRef = useRef<RoomObject[][]>([]);
  const redoRef = useRef<RoomObject[][]>([]);
  const nextIdRef = useRef<number>(1000);
  const scaleRef = useRef<number>(1);
  const modeRef = useRef<Mode>("visit");

  const router = useRouter();
  const [mode, setMode] = useState<Mode>("visit");
  const [objects, setObjects] = useState<RoomObject[]>(DEFAULT_OBJECTS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [cameraY, setCameraY] = useState(20);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [roomName, setRoomName] = useState("Maple Hideout");
  const [happiness, setHappiness] = useState(128);
  const [coins, setCoins] = useState(INITIAL_COINS);
  const [floor, setFloor] = useState(1);
  const [trainCount, setTrainCount] = useState(2);
  const [trainMax] = useState(4);
  const [suppliesProgress, setSuppliesProgress] = useState(28640);
  const [suppliesMax] = useState(40000);
  const [agentBubble, setAgentBubble] = useState<string | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<{id:number,x:number,y:number,createdAt:number}[]>([]);
  const [collectButtonCooldownUntil, setCollectButtonCooldownUntil] = useState(0);
  const heartIdRef = useRef(0);
  const [shopOpen, setShopOpen] = useState(false);
  const theme = useMemo<RoomTheme>(() => getTimeTheme(), []);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [roomW, setRoomW] = useState(ROOM_TILES_X);
  const [roomH, setRoomH] = useState(ROOM_TILES_Y);
  const roomWRef = useRef(ROOM_TILES_X);
  const roomHRef = useRef(ROOM_TILES_Y);
  const coinsRef = useRef(INITIAL_COINS);
  const { agent, assignTask, clearAgentTask, enqueueTask, clearQueue, routeDebug } = useAgentWalk({
    roomObjects: objects,
    roomWidth: roomW,
    roomHeight: roomH,
  });
  const previousAgentStateRef = useRef(agent.state);
  const previousTaskTypeRef = useRef(agent.taskType);
  // Second agent — autopilot demo. Cycles through tasks deterministically when
  // idle so the multi-agent foundation is visible without extra HUD chrome.
  const aki = useAgentWalk({
    roomObjects: objects,
    roomWidth: roomW,
    roomHeight: roomH,
    agentId: 'agent-2',
    agentName: 'Aki',
    characterId: 'aki',
    startIso: { wx: 7.0, wy: 0.65, wz: 0.2 },
  });
  const akiTaskIndexRef = useRef(0);
  useEffect(() => {
    if (aki.agent.state !== 'idle') return;
    const cycle: AgentTaskType[] = ['code', 'research', 'meeting', 'document', 'print', 'rest'];
    const next = cycle[akiTaskIndexRef.current % cycle.length]!;
    akiTaskIndexRef.current += 1;
    const handle = window.setTimeout(() => aki.assignTask(next), 1500);
    return () => window.clearTimeout(handle);
  }, [aki, aki.agent.state]);
  // Track character positions
  useEffect(() => {
    const update = (id: string, pos: {x:number;y:number}, dir: string) => {
      const c = charSpritesRef.current.get(id);
      if (c) { c.x = pos.x; c.y = pos.y - 40; c.scale.x = dir === 'left' ? -Math.abs(c.scale.x) : Math.abs(c.scale.x); }
    };
    update('agent-1', agent.position, agent.direction);
    update('agent-2', aki.agent.position, aki.agent.direction);
  }, [agent.position, agent.direction, aki.agent.position, aki.agent.direction]);

  // ── Spine animation state mapping ────────────────────────────────────────────
  const SPINE_ANIM_CANDIDATES: Record<AgentState, string[]> = {
    idle:        ['normal','stand','stand2','sit','sleep'],
    walking:     ['walk','move','move_left','normal','stand'],
    thinking:    ['normal','stand','stand2'],
    coding:      ['normal','stand','stand2'],
    researching: ['normal','stand','stand2'],
    meeting:     ['normal','stand','stand2'],
    documenting: ['normal','stand','stand2'],
    reviewing:   ['normal','stand','stand2'],
    printing:    ['normal','stand','stand2'],
    resting:     ['sit','sleep','normal','stand'],
    done:        ['victory','normal','stand'],
    error:       ['break','normal','stand'],
  };

  const ONE_SHOT_STATES = new Set<AgentState>(['done', 'error']);
  const CALM_ANIMS = ['normal','stand','stand2','sit','sleep'];

  useEffect(() => {
    const applyAnim = (id: string, state: AgentState) => {
      const spine = charSpritesRef.current.get(id) as any;
      if (!spine?.state) return;
      const candidates = SPINE_ANIM_CANDIDATES[state];
      if (!candidates) return;
      const available = (spine.spineData.animations as any[]).map((a:any) => a.name) as string[];
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
    applyAnim('agent-1', agent.state);
    applyAnim('agent-2', aki.agent.state);
  }, [agent.state, aki.agent.state]);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useCountdown(8 * 3600 + 23 * 60 + 17);
  const suppliesTimer = useCountdown(12 * 3600 + 45 * 60 + 30);

  // ── Game mechanics ──────────────────────────────────────────────────────────
  // Food drain
  useEffect(() => {
    const id = setInterval(() => setSuppliesProgress(p => Math.max(0, p - 3)), 3000);
    return () => clearInterval(id);
  }, []);
  // Speech bubbles
  const CHATTER = ["Hmm~", "I wonder...", "Ah, an idea!", "So cozy!", "Working hard!", "Zzz... oh!", "Need supplies~", "Let's go!"];
  useEffect(() => {
    const tick = () => { setAgentBubble(CHATTER[Math.floor(Math.random()*CHATTER.length)]!); setTimeout(() => setAgentBubble(null), 2500); };
    const t = setTimeout(() => { tick(); setInterval(() => { if (!document.hidden) tick(); }, 15000); }, 8000);
    return () => clearTimeout(t);
  }, []);
  // Heart cleanup
  useEffect(() => { if (!floatingHearts.length) return; const id = setInterval(() => setFloatingHearts(h => h.filter(x => performance.now()-x.createdAt<1500)), 200); return () => clearInterval(id); }, [floatingHearts.length]);
  // Collect button cooldown cleanup on unmount
  useEffect(() => () => { if (collectButtonCooldownTimeoutRef.current) clearTimeout(collectButtonCooldownTimeoutRef.current); }, []);

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

    try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved) as {
              objects?: RoomObject[];
              roomName?: string;
              happiness?: number;
              floor?: number;
              coins?: number;
              nextId?: number;
              roomW?: number;
              roomH?: number;
            };
            const loadedW =
              typeof parsed.roomW === "number"
                ? Math.max(6, Math.min(16, parsed.roomW))
                : ROOM_TILES_X;
            const loadedH =
              typeof parsed.roomH === "number"
                ? Math.max(5, Math.min(14, parsed.roomH))
                : ROOM_TILES_Y;
            setRoomW(loadedW);
            roomWRef.current = loadedW;
            setRoomH(loadedH);
            roomHRef.current = loadedH;
            if (parsed.objects?.length)
              roomObjects = parsed.objects.map((o) =>
                snapObj(o, loadedW, loadedH),
              );
            if (parsed.roomName) setRoomName(parsed.roomName);
            if (typeof parsed.happiness === "number")
              setHappiness(parsed.happiness);
            if (typeof parsed.floor === "number") setFloor(parsed.floor);
            if (typeof parsed.coins === "number") {
              setCoins(parsed.coins);
              coinsRef.current = parsed.coins;
            }
            if (typeof parsed.nextId === "number")
              nextIdRef.current = parsed.nextId;
          }
        } catch {
          /* ignore */
        }

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
          roomObjects = shared.objects.map((o) =>
            snapObj(o, shared.roomW, shared.roomH),
          );
          removeSharedLayoutQuery();
        }

        // Ensure nextIdRef is greater than any existing id
        const maxId = Math.max(...roomObjects.map((o) => o.id), 999);
        if (nextIdRef.current <= maxId) nextIdRef.current = maxId + 1;

        setObjects(roomObjects);
        objectsRef.current = roomObjects;

        setRoomProjection(roomWRef.current, roomHRef.current);
        const scene = buildRoomScene(app.stage, roomObjects, {
          onSelect: (id) => {
            if (modeRef.current === "move") return;
            setSelectedId((prev) => (prev === id ? null : id));
          },
          onDragStart: (id, sx, sy) => {
            if (modeRef.current !== "move") return;
            if (!dragRef.current) {
              const item = objectsRef.current.find((o) => o.id === id);
              const wx = item?.wx ?? 0,
                wy = item?.wy ?? 0;
              dragRef.current = {
                id,
                screenX: sx,
                screenY: sy,
                accX: Math.round(wx),
                accY: Math.round(wy),
                lastValidX: wx,
                lastValidY: wy,
                startX: wx,
                startY: wy,
              };
            }
          },
        });
        sceneRef.current = scene;
        drawBackground(
          scene.backgroundGraphics,
          roomWRef.current,
          roomHRef.current,
          theme,
        );

        // ── Load real Spine 3.8 characters ────────────────────────────────────
        const CHAR_DEFS = [
          { skel: '/azur-char/qiye/qiye_h.skel',
            atlas: '/azur-char/qiye/qiye_h.atlas',
            wx: 5.0, wy: 0.65, wz: 0.0, id: 'agent-1', name: 'qiye' },
          { skel: '/azur-char/dunkeerke/dunkeerke.skel',
            atlas: '/azur-char/dunkeerke/dunkeerke.atlas',
            wx: 8.0, wy: 0.65, wz: 0.0, id: 'agent-2', name: 'dunkeerke' },
        ];

        for (const def of CHAR_DEFS) {
          PIXI.Assets.load([def.skel, def.atlas])
            .then((loaded: Record<string, any>) => {
              const skelKey = def.skel;
              const spineData = loaded[skelKey]?.spineData;
              if (!spineData) {
                console.warn(`[Spine] No spineData for ${def.name}`);
                return;
              }
              const spine = new Spine(spineData);
              const [sx, sy] = proj(def.wx, def.wy, def.wz);
              spine.x = sx;
              spine.y = sy - 30;
              spine.scale.set(0.28);
              // Depth sort with furniture: character footprint ~1×1 tile
              const [, backY] = proj(def.wx + 0.5, def.wy + 1.0, def.wz);
              spine.zIndex = backY + def.wx * 4 + def.wz * 25;
              scene.furnitureLayer.addChild(spine);
              charSpritesRef.current.set(def.id, spine);

              // ── Tap interaction ──────────────────────────────────────────
              spine.eventMode = 'static';
              spine.cursor = 'pointer';
              spine.hitArea = new PIXI.Circle(0, -15, 40);
              spine.on('pointertap', () => {
                // ── Collect cooldown (3s per character) ──
                const now = Date.now();
                if (now - (lastCollectRef.current[def.id] ?? 0) < 3000) {
                  if (now - lastCooldownToastRef.current > 1000) {
                    lastCooldownToastRef.current = now;
                    showToast("Wait a moment~");
                  }
                  return;
                }
                lastCollectRef.current[def.id] = now;

                const state = (spine as any).state;
                const anims = ((spine as any).spineData.animations as any[]).map((a:any) => a.name);
                const oneShotAnims = new Set(['victory', 'break']);
                const current = state.getCurrent(0);
                if (current && oneShotAnims.has(current.animation.name)) return;
                const tap = ['touch','motou'].find((a) => anims.includes(a));
                if (!tap) return;
                if (current?.animation?.name === tap) return;
                state.setAnimation(0, tap, false);
                const calm = ['normal','stand','stand2','sit','sleep'].find((c) => anims.includes(c)) ?? anims[0];
                if (calm) state.addAnimation(0, calm, true, 0);

                // ── Collect rewards ──
                setHappiness(h => h + 3);
                setCoins(c => c + 15);
                setFloatingHearts(prev => [...prev, {
                  id: ++heartIdRef.current,
                  x: sx, y: sy - 60,
                  createdAt: performance.now(),
                }]);
                showToast("♡+3 🪙+15");
              });

              // Log animation names + play calm lounge default
              const animNames = spine.spineData.animations.map(
                (a: any) => a.name,
              );
              console.log(`[Spine] ${def.name} animations:`, animNames);
              if (animNames.length > 0) {
                const priority = ['normal', 'stand', 'stand2', 'sit', 'sleep'];
                const target = priority.find((a) => animNames.includes(a)) ?? animNames[0];
                spine.state.setAnimation(0, target, true);
              }
            })
            .catch((e: Error) => {
              console.error(`[Spine] Failed to load ${def.name}:`, e.message);
            });
        }

        app.stage.on("pointermove", (e: PIXI.FederatedPointerEvent) => {
          const drag = dragRef.current;
          if (!drag) return;
          const dx = (e.global.x - drag.screenX) / scaleRef.current;
          const dy = (e.global.y - drag.screenY) / scaleRef.current;
          drag.screenX = e.global.x;
          drag.screenY = e.global.y;
          const [dwx, dwy] = worldDeltaFromScreen(dx, dy);
          drag.accX += dwx;
          drag.accY += dwy;
          const item = objectsRef.current.find((o) => o.id === drag.id);
          if (!item) return;
          const fp = FURNITURE_TILES[item.furnitureType];
          const nx = Math.round(
            Math.max(0, Math.min(roomWRef.current - fp.w, drag.accX)),
          );
          const ny = Math.round(
            Math.max(0, Math.min(roomHRef.current - fp.d, drag.accY)),
          );
          const colliding = checkCollision(objectsRef.current, drag.id, nx, ny);
          // Move item visually to new position regardless of collision
          objectsRef.current = objectsRef.current.map((o) =>
            o.id === drag.id ? { ...o, wx: nx, wy: ny } : o,
          );
          scene.updateItem(drag.id, nx, ny, item.wz);
          scene.setDragHighlight(drag.id, colliding);
          if (!colliding) {
            drag.lastValidX = nx;
            drag.lastValidY = ny;
          }
        });

        const endDrag = () => {
          const drag = dragRef.current;
          if (!drag) return;
          const didMove =
            drag.startX !== drag.lastValidX || drag.startY !== drag.lastValidY;
          // Snap back to last valid position if current is colliding
          const item = objectsRef.current.find((o) => o.id === drag.id);
          if (item) {
            const finalX = drag.lastValidX,
              finalY = drag.lastValidY;
            if (didMove) {
              const previous = objectsRef.current.map((o) =>
                o.id === drag.id
                  ? { ...o, wx: drag.startX, wy: drag.startY }
                  : { ...o },
              );
              pushHistorySnapshot(previous);
            }
            objectsRef.current = objectsRef.current.map((o) =>
              o.id === drag.id ? { ...o, wx: finalX, wy: finalY } : o,
            );
            scene.updateItem(drag.id, finalX, finalY, item.wz);
          }
          scene.setSelected(null);
          dragRef.current = null;
          setObjects([...objectsRef.current]);
        };
        app.stage.on("pointerup", endDrag);
        app.stage.on("pointerupoutside", endDrag);

    })(); // close async IIFE

    return () => {
      mounted = false;
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
    sceneRef.current.rebuild(objectsRef.current);
  }, [roomW, roomH, theme]);

  // ── Tile grid overlay (edit mode + room size change) ────────────────────────
  useEffect(() => {
    sceneRef.current?.setEditMode(mode === "move", roomW, roomH);
  }, [mode, roomW, roomH]);

  // ── Active station pulse (driven by agent work lifecycle) ───────────────────
  const working = agent.workDurationMs !== undefined;
  const stationId = agent.targetStationId as LoungeStationId | undefined;
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
      setPanX(0); setPanY(0);
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // ── Pan & Zoom ───────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const d = e.deltaY > 0 ? -0.08 : 0.08;
    const ns = Math.max(0.5, Math.min(2.5, scale + d));
    const r = ns / scale;
    const rect = e.currentTarget.getBoundingClientRect();
    setPanX(p => e.clientX - rect.left - (e.clientX - rect.left - p) * r);
    setPanY(p => e.clientY - rect.top - (e.clientY - rect.top - p) * r);
    setScale(ns); scaleRef.current = ns;
  }, [scale]);
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (modeRef.current !== 'visit') return;
    if ((e.target as HTMLElement).closest('button,input,a')) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
  }, [panX, panY]);
  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanX(panStartRef.current.panX + e.clientX - panStartRef.current.x);
    setPanY(panStartRef.current.panY + e.clientY - panStartRef.current.y);
  }, [isPanning]);
  const handlePanEnd = useCallback(() => setIsPanning(false), []);

  // ── Persist ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          objects,
          roomName,
          happiness,
          floor,
          coins,
          nextId: nextIdRef.current,
          roomW,
          roomH,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [objects, roomName, happiness, floor, coins, roomW, roomH]);

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

  // ── Task completion reward ──────────────────────────────────────────────────
  useEffect(() => {
    const prevState = previousAgentStateRef.current;
    const prevTaskType = previousTaskTypeRef.current;
    if (
      agent.state === "idle" &&
      prevState !== "idle" &&
      prevState !== "walking" &&
      prevState !== "error" &&
      prevTaskType &&
      prevTaskType !== "idle"
    ) {
      const reward = TASK_REWARDS[prevTaskType] ?? { coins: 0, happiness: 0 };
      if (reward.coins > 0 || reward.happiness > 0) {
        setCoins((c) => c + reward.coins);
        setHappiness((h) => h + reward.happiness);
        showToast(`+${reward.coins} 🪙  +${reward.happiness} ♡`);
      }
    }
    previousAgentStateRef.current = agent.state;
    previousTaskTypeRef.current = agent.taskType;
  }, [agent.state, agent.taskType, showToast]);

  const applyLayoutObjects = useCallback((nextObjects: RoomObject[]) => {
    const snapped = nextObjects.map((obj) =>
      snapObj(obj, roomWRef.current, roomHRef.current),
    );
    objectsRef.current = snapped;
    sceneRef.current?.rebuild(snapped);
    setObjects(cloneLayout(snapped));
    setSelectedId((prev) =>
      prev !== null && snapped.some((o) => o.id === prev) ? prev : null,
    );
  }, []);

  const pushHistorySnapshot = useCallback((snapshot: RoomObject[]) => {
    historyRef.current.push(cloneLayout(snapshot));
    if (historyRef.current.length > 50) historyRef.current.shift();
    redoRef.current = [];
  }, []);

  const handleUndo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) {
      showToast("Nothing to undo");
      return;
    }
    redoRef.current.push(cloneLayout(objectsRef.current));
    applyLayoutObjects(prev);
    showToast("Undo");
  }, [applyLayoutObjects, showToast]);

  const handleRedo = useCallback(() => {
    const next = redoRef.current.pop();
    if (!next) {
      showToast("Nothing to redo");
      return;
    }
    historyRef.current.push(cloneLayout(objectsRef.current));
    applyLayoutObjects(next);
    showToast("Redo");
  }, [applyLayoutObjects, showToast]);

  const handleAutoArrange = useCallback(() => {
    const arranged = autoArrangeLayout(
      objectsRef.current,
      roomWRef.current,
      roomHRef.current,
    );
    if (!arranged) {
      showToast("Could not auto-arrange all items");
      return;
    }
    pushHistorySnapshot(objectsRef.current);
    applyLayoutObjects(arranged);
    showToast("Auto-arranged");
  }, [applyLayoutObjects, pushHistorySnapshot, showToast]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleTrain = useCallback(() => {
    if (trainCount >= trainMax) {
      showToast("Training complete! Wait for refresh.");
      return;
    }
    setHappiness((h) => h + 5);
    setCoins((c) => c + TRAIN_REWARD);
    setTrainCount((t) => t + 1);
    showToast(`+${TRAIN_REWARD} 🪙  +5 😊`);
  }, [trainCount, trainMax, showToast]);

  const handlePurchase = useCallback(
    (item: CatalogItem) => {
      if (coinsRef.current < item.cost) {
        showToast("Not enough coins");
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
        showToast("No free space");
        return;
      }

      pushHistorySnapshot(objectsRef.current);
      coinsRef.current -= item.cost;
      setCoins(coinsRef.current);
      setHappiness((h) => h + item.happiness);

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
      showToast("Item removed");
    },
    [pushHistorySnapshot, showToast],
  );

  const handleReset = useCallback(async () => {
    if (
      !confirm(
        "Reset room to default layout? Any custom items will be removed.",
      )
    )
      return;
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
    showToast("Room reset");
  }, [applyLayoutObjects, pushHistorySnapshot, showToast]);

  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return;

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
      showToast("Share not available");
      return;
    }

    const shareUrl = `${window.location.origin}${window.location.pathname}?${LAYOUT_QUERY_PARAM}=${encoded}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Share link copied");
    } catch {
      const ok = window.prompt("Copy this lounge link", shareUrl);
      showToast(ok !== null ? "Share link ready" : "Could not copy link");
    }
  }, [coins, floor, happiness, roomH, roomName, roomW, showToast]);

  const selectedObj = objects.find((o) => o.id === selectedId) ?? null;
  const suppliesPct = Math.round((suppliesProgress / suppliesMax) * 100);
  const totalHappiness =
    happiness + objects.reduce((s, o) => s + o.happiness, 0);
  const canUndo = historyRef.current.length > 0;
  const canRedo = redoRef.current.length > 0;

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={viewportRef}
      className="relative flex-1 w-full overflow-hidden select-none"
      style={{
        height: "calc(100vh - 45px)",
        minHeight: "calc(100vh - 45px)",
        background: `linear-gradient(180deg,${theme.skyTop} 0%,${theme.skyBot} 100%)`,
        cursor: isPanning ? 'grabbing' : mode === 'visit' ? 'grab' : 'default',
      }}
      onWheel={handleWheel}
      onMouseDown={handlePanStart}
      onMouseMove={handlePanMove}
      onMouseUp={handlePanEnd}
      onMouseLeave={handlePanEnd}
    >
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
          {mode === "move" ? (
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
            onClick={() => setMode((m) => (m === "visit" ? "move" : "visit"))}
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
            {totalHappiness}
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
          title="Next meal"
        >
          <span className="text-[11px] leading-none max-sm:text-[9px]">🍱</span>
          <span className="text-[10px] font-mono font-bold text-[#5a3c18] tabular-nums max-sm:text-[8px]">
            {timer}
          </span>
          {suppliesProgress === 0 && (
            <span className="text-[7px] font-black text-[#991b1b] bg-[#fecaca] rounded-full px-1 py-px animate-pulse max-sm:text-[6px]">
              Empty
            </span>
          )}
        </div>
      </div>

      {/* ── Move-mode banner ────────────────────────────────────────── */}
      {mode === "move" && (
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
            className={`rounded-full px-2 py-0.5 text-[9px] font-black active:scale-95 transition max-sm:px-1.5 max-sm:text-[7px] ${canUndo ? "bg-[#166534] text-white hover:bg-[#14532d]" : "bg-[#94a3b8] text-[#334155] cursor-not-allowed"}`}
          >
            ↶ Undo
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            className={`rounded-full px-2 py-0.5 text-[9px] font-black active:scale-95 transition max-sm:px-1.5 max-sm:text-[7px] ${canRedo ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9]" : "bg-[#94a3b8] text-[#334155] cursor-not-allowed"}`}
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
      {mode === "move" && showRoomSettings && (
        <div className="absolute left-1/2 top-14 z-40 -translate-x-1/2 rounded-2xl border border-[#c8a870] bg-[#f5e4c0]/95 px-5 py-3 shadow-xl backdrop-blur-sm flex flex-col gap-2 min-w-[220px]">
          <span className="text-[11px] font-black text-[#5a3c18]">
            Room Size
          </span>
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
            <span className="text-[11px] font-bold text-[#5a3c18] w-6 text-center">
              {roomW}
            </span>
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
            <span className="text-[11px] font-bold text-[#5a3c18] w-6 text-center">
              {roomH}
            </span>
          </div>
          <span className="text-[9px] text-[#8b5e30] text-center">
            {roomW} × {roomH} tiles — saved automatically
          </span>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`absolute left-1/2 z-40 -translate-x-1/2 rounded-full bg-[#fdf6e8] border border-[#c8a870] px-4 py-1.5 shadow-lg animate-pulse max-sm:px-3 max-sm:py-1 ${mode === "move" ? "top-20 max-sm:top-24" : "top-16 max-sm:top-14"}`}>
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
            transformOrigin: "center center",
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="absolute inset-0"
          />

          <div className="absolute inset-0 z-30 pointer-events-none">
            {mode === "move" && routeDebug.points.length > 0 && (
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
                        points={points.map((point) => `${point.x},${point.y}`).join(" ")}
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
                            fill={index === remaining.length - 1 ? "#facc15" : "#e0f2fe"}
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

            {/* ── Lounge agents walking overlay ─────────────────────── */}
            {[agent, aki.agent].map((a) => {
              const ANIM_FILE: Record<string, string> = {
                idle: "01-idle",
                walk_up: "04-thinking",
                walk_down: "04-thinking",
                walk_left: "04-thinking",
                walk_right: "04-thinking",
                thinking: "04-thinking",
                typing: "08-excited",
                reading: "04-thinking",
                talking: "05-happy",
                documenting: "08-excited",
                printing: "08-excited",
                resting: "07-sleepy",
                happy: "05-happy",
                confused: "09-surprised",
              };
              const moodFile = ANIM_FILE[a.animation] ?? "01-idle";
              const imgSrc = `/characters/${a.characterId}/${moodFile}.jpg`;
              const { x, y } = a.position;
              const SZ = 64;
              return (
                <div key={a.id}>
                  {a.bubbleText && (
                    <div
                      className="pointer-events-none absolute z-20 max-w-[160px] rounded-2xl bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-gray-800 shadow-lg"
                      style={{
                        left: x,
                        top: y - SZ - 8,
                        transform: "translate(-50%, -100%)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.bubbleText}
                      <span className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-white/95" />
                    </div>
                  )}
                  <div
                    className="absolute z-10"
                    style={{
                      left: x,
                      top: y,
                      transform: "translate(-50%, -100%)",
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
                </div>
              );
            })}
          </div>

          <FurnitureInspector
            object={selectedObj}
            onClose={() => setSelectedId(null)}
            onMoveMode={() => setMode("move")}
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
              onClick={(e) =>
                e.shiftKey ? enqueueTask(task) : assignTask(task)
              }
              title={`${label} — shift-click to enqueue`}
              className={`flex flex-col items-center gap-0 rounded-xl px-2 py-1 text-[10px] font-bold transition active:scale-95 max-sm:px-1 max-sm:py-0.5 max-sm:text-[8px] ${
                agent.taskType === task && agent.state !== "idle"
                  ? "bg-[#e8a030] text-white shadow ring-2 ring-[#e8a030]/40"
                  : "text-[#5a3c18] hover:bg-[#f0d8a8]"
              }`}
            >
              <span className="text-[15px] leading-none max-sm:text-[13px]">{icon}</span>
              <span className="leading-none mt-0.5 max-sm:mt-0">{label}</span>
            </button>
          ))}
          {agent.state !== "idle" && (
            <button
              type="button"
              onClick={clearAgentTask}
              className={`ml-0.5 rounded-xl px-2 py-1 text-[11px] font-bold active:scale-95 transition ${
                agent.state === "error"
                  ? "bg-[#fca5a5]/60 text-[#7f1d1d] ring-1 ring-[#991b1b]/40 hover:bg-[#fca5a5]/80"
                  : "text-[#9a3c18] hover:bg-[#fdd]"
              }`}
              title="Stop agent and clear queue"
            >
              {agent.state === "error" ? (
                <>
                  ✕<span className="ml-1 max-sm:hidden">Clear</span>
                </>
              ) : (
                "✕"
              )}
            </button>
          )}
        </div>
        {agent.state === "error" && (
          <span className="text-[8px] font-semibold text-[#991b1b]/70 max-sm:hidden">
            ✕ to clear
          </span>
        )}
        {agent.taskQueue.length > 0 && (
          <div className="flex items-center gap-1 rounded-full border border-[#c8a870] bg-[#f5e4c0]/90 px-2 py-0.5 shadow-sm max-sm:px-1.5">
            <span className="text-[8px] font-bold text-[#7a5000] tracking-wide">
              Next:
            </span>
            <span
              title={TASK_ICON_LABEL[agent.taskQueue[0]!]}
              className="text-[11px] leading-none"
            >
              {TASK_ICON[agent.taskQueue[0]!] ?? "·"}
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
          onClick={() => {
            const now = Date.now();
            if (now < collectButtonCooldownUntil) {
              showToast("Wait a moment~");
              return;
            }
            // Set cooldown
            if (collectButtonCooldownTimeoutRef.current) clearTimeout(collectButtonCooldownTimeoutRef.current);
            setCollectButtonCooldownUntil(now + COLLECT_BUTTON_COOLDOWN_MS);
            collectButtonCooldownTimeoutRef.current = setTimeout(
              () => setCollectButtonCooldownUntil(0),
              COLLECT_BUTTON_COOLDOWN_MS,
            );
            // Grant reward
            setHappiness(h => h + 3);
            setCoins(c => c + 15);
            setSuppliesProgress(p => Math.min(40000, p + 50));
            setFloatingHearts(prev => [...prev, { id: ++heartIdRef.current, x: 45 + Math.random() * 10, y: 50, createdAt: performance.now() }]);
            showToast("♡+3 🪙+15 🍱+50");
          }}
          className={
            Date.now() < collectButtonCooldownUntil
              ? "rounded-full bg-[#ff69b4]/5 border border-[#ff69b4]/15 px-2.5 py-0.5 text-[9px] font-bold text-[#d4708a]/40 cursor-not-allowed opacity-50 transition max-sm:px-2 max-sm:text-[8px]"
              : "rounded-full bg-[#ff69b4]/15 border border-[#ff69b4]/30 px-2.5 py-0.5 text-[9px] font-bold text-[#d4708a] hover:bg-[#ff69b4]/25 active:scale-95 transition max-sm:px-2 max-sm:text-[8px]"
          }
        >
          {Date.now() < collectButtonCooldownUntil ? "♡ Wait…" : "♡ Collect"}
        </button>

        {/* Character roster cards */}
        <div className="flex items-center gap-2 mt-1 max-sm:gap-1 max-sm:mt-0.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-[#c8a870] bg-[#f5e4c0]/90 px-2 py-1 max-sm:px-1.5 max-sm:py-0.5 max-sm:gap-1">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-[#ffe4ec] max-sm:w-5 max-sm:h-5">
              <Image src="/azur-char/qiye_h.png" alt="Mai" width={28} height={28}
                className="object-cover scale-[3] translate-x-[2px] translate-y-[4px]" />
            </div>
            <span className="text-[10px] font-bold text-[#5a3c18] max-sm:text-[8px]">Mai</span>
            <span className={`text-[9px] font-bold rounded-full px-2 py-0.5 max-sm:text-[7px] max-sm:px-1.5 ${STATE_COLOR[agent.state] ?? "bg-[#e8d0a0]/30 text-[#5a3c18]"}`}>
              {STATE_LABEL[agent.state] ?? agent.state}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-[#c8a870] bg-[#f5e4c0]/90 px-2 py-1 max-sm:px-1.5 max-sm:py-0.5 max-sm:gap-1">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-[#e8f0ff] max-sm:w-5 max-sm:h-5">
              <Image src="/azur-char/dunkeerke.png" alt="Aki" width={28} height={28}
                className="object-cover scale-[3] translate-x-[2px] translate-y-[4px]" />
            </div>
            <span className="text-[10px] font-bold text-[#5a3c18] max-sm:text-[8px]">Aki</span>
            <span className={`text-[9px] font-bold rounded-full px-2 py-0.5 max-sm:text-[7px] max-sm:px-1.5 ${STATE_COLOR[aki.agent.state] ?? "bg-[#e8d0a0]/30 text-[#5a3c18]"}`}>
              {STATE_LABEL[aki.agent.state] ?? aki.agent.state}
            </span>
          </div>
        </div>
        {agent.state === "error" && agent.bubbleText && (
          <span className="flex items-center gap-1 rounded-full border border-[#991b1b]/30 bg-[#fca5a5]/40 px-2 py-0.5 text-[8px] font-semibold text-[#991b1b] max-sm:text-[7px]">
            <span aria-hidden>⚠️</span>
            {agent.bubbleText}
          </span>
        )}
        {agent.workDurationMs !== undefined &&
          agent.workElapsedMs !== undefined && (
            <div className="flex flex-col items-center gap-0.5 mt-0.5">
              <span className="text-[8px] font-semibold text-[#7a5000]/70 max-sm:text-[7px]">
                Working · {Math.max(1, Math.ceil((agent.workDurationMs - agent.workElapsedMs) / 1000))}s left
              </span>
              <div className="relative h-1 w-32 overflow-hidden rounded-full bg-[#e8d0a0]">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-[#e8a030]"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        (agent.workElapsedMs / agent.workDurationMs) * 100,
                      ),
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
            disabled={trainCount >= trainMax}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-white shadow-md active:scale-95 transition ${
              trainCount >= trainMax
                ? "bg-[#a0a0a0] cursor-not-allowed"
                : "bg-[#e84040] hover:bg-[#d03030]"
            }`}
          >
            <span className="text-[11px] font-black">Train</span>
            <span className="text-[10px] font-bold opacity-90 tabular-nums">
              {trainCount}/{trainMax}
            </span>
          </button>
        </div>
        <div className="rounded-xl border border-[#c8a870] bg-[#f5e4c0]/90 px-2.5 py-1.5 shadow-md backdrop-blur-sm min-w-[168px]">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px]">📦</span>
            <span className="text-[9px] font-bold text-[#5a3c18]">Supplies</span>
            <span className="ml-auto text-[9px] font-mono font-bold text-[#2a7a30] tabular-nums">
              {suppliesTimer}
            </span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[#e8d0a0]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[#e84040] transition-all"
              style={{ width: `${suppliesPct}%` }}
            />
          </div>
          <div className="mt-0.5 text-right text-[8px] font-bold text-[#5a3c18] tabular-nums">
            {suppliesProgress.toLocaleString()}/{suppliesMax.toLocaleString()}
          </div>
        </div>

        {/* Speech bubble */}
        {agentBubble && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#ffb6c1] bg-white/90 px-3 py-1 text-[10px] font-bold text-[#8b4c6e] shadow-md animate-bounce pointer-events-none z-50">
            {agentBubble}
          </div>
        )}
        {/* Floating hearts */}
        {floatingHearts.map(h => (
          <div key={h.id} className="absolute pointer-events-none text-lg animate-ping z-50"
            style={{ left: h.x + '%', top: h.y + '%', animation: 'floatUp 1.5s ease-out forwards' }}>
            💕
          </div>
        ))}
      </div>

      {/* ── Bottom-right: Action dock ──────────────────────────────── */}
      <div className="absolute right-2 bottom-2 z-30 flex items-center gap-1 max-sm:right-1 max-sm:bottom-1 max-sm:gap-0.5">
        <button
          type="button"
          onClick={() => setMode((m) => (m === "visit" ? "move" : "visit"))}
          title={mode === "move" ? "Done editing" : "Move furniture"}
          className={`flex flex-col items-center justify-center gap-0 rounded-xl border px-2.5 py-1.5 shadow-md active:scale-95 transition min-w-[54px] max-sm:min-w-[44px] max-sm:px-2 max-sm:py-1 ${mode === "move" ? "border-[#e8b800] bg-[#fde68a] text-[#7a5000]" : "border-[#c8a870] bg-[#f5e4c0]/90 text-[#5a3c18] hover:bg-[#f0d8a8]"}`}
        >
          <span className="text-[18px] leading-none max-sm:text-[16px]">🪑</span>
          <span className="text-[9px] font-bold mt-0.5 max-sm:text-[7px]">
            {mode === "move" ? "Done" : "Move"}
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
        <button
          type="button"
          onClick={handleShare}
          title="Share lounge link"
          className="flex flex-col items-center justify-center gap-0 rounded-xl border border-[#4a8acc] bg-[#b8d8f0]/90 px-2.5 py-1.5 shadow-md hover:bg-[#a0c8e8] active:scale-95 transition min-w-[54px] max-sm:min-w-[44px] max-sm:px-2 max-sm:py-1"
        >
          <span className="text-[18px] leading-none max-sm:text-[16px]">☁️</span>
          <span className="text-[9px] font-bold text-[#1a4870] mt-0.5 max-sm:text-[7px]">Share</span>
        </button>
        <button
          type="button"
          onClick={() => setFloor((f) => (f === 1 ? 2 : 1))}
          title="Change floor"
          className="flex flex-col items-center justify-center gap-0 rounded-xl border border-[#c8a870] bg-[#f5e4c0]/90 px-2.5 py-1.5 shadow-md hover:bg-[#f0d8a8] active:scale-95 transition min-w-[54px] max-sm:min-w-[44px] max-sm:px-2 max-sm:py-1"
        >
          <span className="text-[18px] leading-none max-sm:text-[16px]">🪜</span>
          <span className="text-[9px] font-bold text-[#5a3c18] mt-0.5 max-sm:text-[7px]">Floor</span>
        </button>
      </div>

      {/* ── Shop modal ─────────────────────────────────────────────── */}
      <ShopModal
        open={shopOpen}
        coins={coins}
        onClose={() => setShopOpen(false)}
        onPurchase={(item) => handlePurchase(item)}
      />
    </div>
  );
}
