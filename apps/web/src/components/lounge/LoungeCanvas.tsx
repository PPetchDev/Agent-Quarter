"use client";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as PIXI from "pixi.js";
import {
  drawBackground,
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
import { useAgentWalk } from "@/hooks/useAgentWalk";
import type { AgentTaskType } from "@/game/agents/agentTypes";
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

const STORAGE_KEY = "squad:lounge:v6";
const ROOM_MAP_URL = "/maps/maple_hideout.json";
const INITIAL_COINS = 500;
const TRAIN_REWARD = 25;

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
  const [roomName, setRoomName] = useState("Maple Hideout");
  const [happiness, setHappiness] = useState(128);
  const [coins, setCoins] = useState(INITIAL_COINS);
  const [floor, setFloor] = useState(1);
  const [trainCount, setTrainCount] = useState(2);
  const [trainMax] = useState(4);
  const [suppliesProgress] = useState(28640);
  const [suppliesMax] = useState(40000);
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
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useTimer();
  const suppliesTimer = useSuppliesTimer();

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
    const app = new PIXI.Application();

    app
      .init({
        canvas,
        width: CANVAS_W,
        height: CANVAS_H,
        backgroundAlpha: 0,
        antialias: true,
      })
      .then(async () => {
        if (!mounted) {
          app.destroy();
          return;
        }
        appRef.current = app;

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
      });

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
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (!working || !stationId) {
      scene.setActiveStation(null, 0);
      return;
    }
    const station = loungeStations[stationId];
    if (!station) {
      scene.setActiveStation(null, 0);
      return;
    }
    const target = objects.find((o) => o.furnitureType === station.furnitureType);
    if (!target) {
      scene.setActiveStation(null, 0);
      return;
    }

    let rafId = 0;
    const start = performance.now();
    const loop = () => {
      const elapsed = performance.now() - start;
      const alpha = 0.55 + 0.35 * Math.sin(elapsed / 220);
      sceneRef.current?.setActiveStation(target.id, alpha);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      sceneRef.current?.setActiveStation(null, 0);
    };
  }, [working, stationId, objects]);

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
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

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

      pushHistorySnapshot(objectsRef.current);
      coinsRef.current -= item.cost;
      setCoins(coinsRef.current);

      const spawn = getDefaultSpawnPosition(item.type);
      const newId = nextIdRef.current++;
      const newObj: RoomObject = {
        id: newId,
        furnitureType: item.type,
        label: item.label,
        description: item.description,
        wx: spawn.wx,
        wy: spawn.wy,
        wz: spawn.wz,
        happiness: item.happiness,
        draggable: item.draggable,
      };
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
      className="relative flex-1 w-full overflow-hidden"
      style={{
        height: "calc(100vh - 45px)",
        minHeight: "calc(100vh - 45px)",
        background: `linear-gradient(180deg,${theme.skyTop} 0%,${theme.skyBot} 100%)`,
      }}
    >
      {/* ── Top-left: Back + Room name ───────────────────────────────── */}
      <div className="absolute left-3 top-3 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c8a870] bg-[#f5e4c0] text-[#5a3c18] shadow-md hover:bg-[#f0d8a8] active:scale-95 transition"
        >
          ←
        </button>
        <div className="flex items-center gap-1.5 rounded-2xl border border-[#c8a870] bg-[#f5e4c0]/90 px-3 py-2 shadow-md backdrop-blur-sm">
          {mode === "move" ? (
            <input
              className="bg-transparent text-[13px] font-bold text-[#5a3c18] outline-none w-32"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          ) : (
            <span className="text-[13px] font-bold text-[#5a3c18]">
              {roomName}
            </span>
          )}
          <button
            type="button"
            onClick={() => setMode((m) => (m === "visit" ? "move" : "visit"))}
            className="text-[#8b5e30] hover:text-[#5a3c18] transition text-[12px]"
          >
            ✏
          </button>
        </div>
      </div>

      {/* ── Top-right: combined stats bar ────────────────────────── */}
      <div className="absolute right-3 top-3 z-30 flex items-stretch rounded-2xl border border-[#c8a870] bg-[#f5e4c0]/90 shadow-md backdrop-blur-sm overflow-hidden">
        <div
          className="flex items-center gap-1 px-2.5 py-1.5"
          title="Happiness"
        >
          <span className="text-[12px] leading-none">😊</span>
          <span className="text-[11px] font-bold text-[#5a3c18] tabular-nums">
            {totalHappiness}
          </span>
        </div>
        <span className="my-1.5 w-px self-stretch bg-[#c8a870]/60" />
        <div
          className="flex items-center gap-1 bg-[#fde68a]/70 px-2.5 py-1.5"
          title="Coins"
        >
          <span className="text-[12px] leading-none">🪙</span>
          <span className="text-[11px] font-black text-[#7a5000] tabular-nums">
            {coins.toLocaleString()}
          </span>
        </div>
        <span className="my-1.5 w-px self-stretch bg-[#c8a870]/60" />
        <button
          type="button"
          onClick={() => setFloor((f) => (f === 1 ? 2 : 1))}
          title="Change floor"
          className="flex items-center px-2.5 py-1.5 hover:bg-[#f0d8a8] transition"
        >
          <span className="text-[11px] font-bold text-[#5a3c18] tabular-nums">
            {floor}F
          </span>
        </button>
        <span className="my-1.5 w-px self-stretch bg-[#c8a870]/60" />
        <div
          className="flex items-center gap-1 px-2.5 py-1.5"
          title="Next meal"
        >
          <span className="text-[11px] leading-none">🍱</span>
          <span className="text-[10px] font-mono font-bold text-[#5a3c18] tabular-nums">
            {timer}
          </span>
        </div>
      </div>

      {/* ── Move-mode banner ────────────────────────────────────────── */}
      {mode === "move" && (
        <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-[#e8b800] bg-[#fde68a] px-3 py-1 shadow-md">
          <span className="text-[10px] font-black text-[#7a5000]">
            ✋ Move Mode
          </span>
          <button
            type="button"
            onClick={handleAutoArrange}
            className="rounded-full bg-[#2563eb] px-2 py-0.5 text-[9px] font-black text-white hover:bg-[#1d4ed8] active:scale-95 transition"
          >
            ✦ Auto
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className={`rounded-full px-2 py-0.5 text-[9px] font-black active:scale-95 transition ${canUndo ? "bg-[#166534] text-white hover:bg-[#14532d]" : "bg-[#94a3b8] text-[#334155] cursor-not-allowed"}`}
          >
            ↶ Undo
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            className={`rounded-full px-2 py-0.5 text-[9px] font-black active:scale-95 transition ${canRedo ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9]" : "bg-[#94a3b8] text-[#334155] cursor-not-allowed"}`}
          >
            ↷ Redo
          </button>
          <button
            type="button"
            onClick={() => setShowRoomSettings((s) => !s)}
            className="rounded-full bg-[#7a5000] px-2 py-0.5 text-[9px] font-black text-[#fde68a] hover:bg-[#5a3800] active:scale-95 transition"
          >
            ⚙ Room
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full bg-[#e84040] px-2 py-0.5 text-[9px] font-black text-white hover:bg-[#d03030] active:scale-95 transition"
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
        <div className="absolute left-1/2 top-16 z-40 -translate-x-1/2 rounded-full bg-[#fdf6e8] border border-[#c8a870] px-4 py-1.5 shadow-lg animate-pulse">
          <span className="text-[11px] font-black text-[#5a3c18]">{toast}</span>
        </div>
      )}

      {/* ── Room canvas ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `translateY(${cameraY}px) scale(${scale})`,
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

            {/* ── Lounge agent walking overlay ─────────────────────── */}
            {(() => {
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
              const moodFile = ANIM_FILE[agent.animation] ?? "01-idle";
              const imgSrc = `/characters/${agent.characterId}/${moodFile}.jpg`;
              const { x, y } = agent.position;
              const SZ = 64;
              return (
                <>
                  {/* Speech bubble */}
                  {agent.bubbleText && (
                    <div
                      className="pointer-events-none absolute z-20 max-w-[160px] rounded-2xl bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-gray-800 shadow-lg"
                      style={{
                        left: x,
                        top: y - SZ - 8,
                        transform: "translate(-50%, -100%)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {agent.bubbleText}
                      <span className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-white/95" />
                    </div>
                  )}

                  {/* Agent sprite */}
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
                      alt={agent.name}
                      width={SZ}
                      height={SZ}
                      className="rounded-full border-2 border-white shadow-md object-cover"
                      unoptimized
                    />
                  </div>
                </>
              );
            })()}
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
      <div className="absolute bottom-3 left-1/2 z-40 -translate-x-1/2 flex flex-col items-center gap-1">
        <div className="flex items-center gap-0.5 rounded-2xl border border-[#c8a870] bg-[#f5e4c0]/95 px-2 py-1.5 shadow-lg backdrop-blur-sm">
          {TASK_DEFS.map(({ task, icon, label }) => (
            <button
              key={task}
              type="button"
              onClick={(e) =>
                e.shiftKey ? enqueueTask(task) : assignTask(task)
              }
              title={`${label} — shift-click to enqueue`}
              className={`flex flex-col items-center gap-0 rounded-xl px-2 py-1 text-[10px] font-bold transition active:scale-95 ${
                agent.taskType === task && agent.state !== "idle"
                  ? "bg-[#e8a030] text-white shadow"
                  : "text-[#5a3c18] hover:bg-[#f0d8a8]"
              }`}
            >
              <span className="text-[15px] leading-none">{icon}</span>
              <span className="leading-none mt-0.5">{label}</span>
            </button>
          ))}
          {agent.state !== "idle" && (
            <button
              type="button"
              onClick={clearAgentTask}
              className="ml-0.5 rounded-xl px-2 py-1 text-[11px] font-bold text-[#9a3c18] hover:bg-[#fdd] active:scale-95 transition"
              title="Stop agent and clear queue"
            >
              ✕
            </button>
          )}
        </div>
        {agent.taskQueue.length > 0 && (
          <div className="flex items-center gap-1 rounded-full border border-[#c8a870] bg-[#f5e4c0]/90 px-2 py-0.5 shadow-sm">
            <span className="text-[8px] font-bold text-[#8b6030] tracking-wider">
              QUEUE
            </span>
            {agent.taskQueue.map((task, i) => (
              <span
                key={`${task}-${i}`}
                title={TASK_ICON_LABEL[task]}
                className="text-[12px] leading-none"
              >
                {TASK_ICON[task] ?? "·"}
              </span>
            ))}
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
        <span className="text-[9px] font-semibold text-[#8b6030]/80 tracking-wide">
          {agent.name} · {agent.state}
        </span>
        {agent.workDurationMs !== undefined &&
          agent.workElapsedMs !== undefined && (
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
          )}
      </div>

      {/* ── Bottom-left: Train + Supplies ───────────────────────────── */}
      <div className="absolute left-3 bottom-3 z-30 flex flex-col gap-1.5">
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
      </div>

      {/* ── Bottom-right: Action dock ──────────────────────────────── */}
      <div className="absolute right-3 bottom-3 z-30 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setMode((m) => (m === "visit" ? "move" : "visit"))}
          title={mode === "move" ? "Done editing" : "Move furniture"}
          className={`flex flex-col items-center justify-center gap-0 rounded-xl border px-2.5 py-1.5 shadow-md active:scale-95 transition min-w-[54px] ${mode === "move" ? "border-[#e8b800] bg-[#fde68a] text-[#7a5000]" : "border-[#c8a870] bg-[#f5e4c0]/90 text-[#5a3c18] hover:bg-[#f0d8a8]"}`}
        >
          <span className="text-[18px] leading-none">🪑</span>
          <span className="text-[9px] font-bold mt-0.5">
            {mode === "move" ? "Done" : "Move"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setShopOpen(true)}
          title="Shop"
          className="flex flex-col items-center justify-center gap-0 rounded-xl border border-[#e89830] bg-[#fad090]/90 px-2.5 py-1.5 shadow-md hover:bg-[#fac070] active:scale-95 transition min-w-[54px]"
        >
          <span className="text-[18px] leading-none">🏪</span>
          <span className="text-[9px] font-bold text-[#7a4000] mt-0.5">Shop</span>
        </button>
        <button
          type="button"
          onClick={handleShare}
          title="Share lounge link"
          className="flex flex-col items-center justify-center gap-0 rounded-xl border border-[#4a8acc] bg-[#b8d8f0]/90 px-2.5 py-1.5 shadow-md hover:bg-[#a0c8e8] active:scale-95 transition min-w-[54px]"
        >
          <span className="text-[18px] leading-none">☁️</span>
          <span className="text-[9px] font-bold text-[#1a4870] mt-0.5">Share</span>
        </button>
        <button
          type="button"
          onClick={() => setFloor((f) => (f === 1 ? 2 : 1))}
          title="Change floor"
          className="flex flex-col items-center justify-center gap-0 rounded-xl border border-[#c8a870] bg-[#f5e4c0]/90 px-2.5 py-1.5 shadow-md hover:bg-[#f0d8a8] active:scale-95 transition min-w-[54px]"
        >
          <span className="text-[18px] leading-none">🪜</span>
          <span className="text-[9px] font-bold text-[#5a3c18] mt-0.5">Floor</span>
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
