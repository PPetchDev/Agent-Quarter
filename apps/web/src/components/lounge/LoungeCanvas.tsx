"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as PIXI from "pixi.js";
import { drawBackground, worldDeltaFromScreen, DEFAULT_OBJECTS } from "./pixiRoom";
import { buildRoomScene, loadRoomJSON } from "./roomLoader";
import type { RoomScene } from "./roomLoader";
import type { RoomObject } from "./roomDefs";
import { FurnitureInspector } from "./FurnitureInspector";
import { ShopModal } from "./ShopModal";
import { getDefaultSpawnPosition, type CatalogItem } from "./furnitureCatalog";
import { CharacterSpot } from "./CharacterSpot";
import { resolveCharacterMoodImagePath } from "@squad/core";
import { useLoungePresence } from "@/hooks/useLoungePresence";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "squad:lounge:v4";
const ROOM_MAP_URL = "/maps/maple_hideout.json";
const INITIAL_COINS = 500;
const TRAIN_REWARD = 25;

type Mode = "visit" | "move";

const CHARACTERS = [
  { id:"mai",     mood:"01-idle", wx:1.42, wy:0.28, wz:1.34, bc:"#f7adc9", gc:"rgba(247,173,201,.45)", gs:20, sz:52, animClass:"fw" as const, dotBg:"#4ade80",  dotFg:"#052e16", dotText:"●", name:"Mai",     role:"Frontend · coding" },
  { id:"ren",     mood:"01-idle", wx:8.05, wy:0.22, wz:1.14, bc:"#5bd49b", gc:"rgba(91,212,155,.4)",   gs:18, sz:47, animClass:"fw" as const, dotBg:"#4ade80",  dotFg:"#052e16", dotText:"●", name:"Ren",     role:"Backend · guarding" },
  { id:"yui",     mood:"01-idle", wx:3.2,  wy:4.9,  wz:1.6,  bc:"#f5c65e", gc:"rgba(245,198,94,.5)",   gs:24, sz:60, animClass:"fl" as const, dotBg:"#fde047",  dotFg:"#713f12", dotText:"★", name:"Yui",     role:"Lead · reviewing" },
  { id:"mika",    mood:"01-idle", wx:2.62, wy:2.42, wz:1.1,  bc:"#c0acef", gc:"rgba(192,172,239,.34)", gs:14, sz:44, animClass:"fi" as const, dotBg:"#94a3b8",  dotFg:"#0f172a", dotText:"○", name:"Mika",    role:"UI · sketching" },
  { id:"aki",     mood:"01-idle", wx:6.6,  wy:2.06, wz:1.0,  bc:"#f4b16a", gc:"rgba(244,177,106,.3)",  gs:14, sz:44, animClass:"fi" as const, dotBg:"#94a3b8",  dotFg:"#0f172a", dotText:"○", name:"Aki",     role:"DevOps · tuning" },
  { id:"senko",   mood:"07-sleepy",wx:6.94,wy:3.64, wz:1.28, bc:"rgba(148,163,184,.24)",gc:"transparent",gs:0,sz:40,animClass:"fs" as const, dotBg:"#334155",  dotFg:"#64748b", dotText:"z", name:"Senko",   role:"Support · sleeping",   sleep:true },
  { id:"shinobu", mood:"07-sleepy",wx:8.1, wy:4.66, wz:1.32, bc:"rgba(148,163,184,.24)",gc:"transparent",gs:0,sz:40,animClass:"fs" as const, dotBg:"#334155",  dotFg:"#64748b", dotText:"z", name:"Shinobu", role:"Strategist · sleeping", sleep:true },
];

function useTimer(startSecs = 8 * 3600 + 23 * 60 + 17) {
  const [s, setS] = useState(startSecs);
  useEffect(() => { const id = setInterval(() => setS(p => Math.max(0, p - 1)), 1000); return () => clearInterval(id); }, []);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${ss}`;
}

function useSuppliesTimer(startSecs = 12 * 3600 + 45 * 60 + 30) {
  const [s, setS] = useState(startSecs);
  useEffect(() => { const id = setInterval(() => setS(p => Math.max(0, p - 1)), 1000); return () => clearInterval(id); }, []);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${ss}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LoungeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const sceneRef = useRef<RoomScene | null>(null);
  const dragRef = useRef<{ id: number; screenX: number; screenY: number } | null>(null);
  const objectsRef = useRef<RoomObject[]>(DEFAULT_OBJECTS);
  const nextIdRef = useRef<number>(1000);
  const scaleRef = useRef<number>(1);
  const modeRef = useRef<Mode>("visit");

  const router = useRouter();
  const { presence, counts } = useLoungePresence();

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
  const [toast, setToast] = useState<string | null>(null);
  const timer = useTimer();
  const suppliesTimer = useSuppliesTimer();

  // Keep refs in sync
  useEffect(() => { objectsRef.current = objects; }, [objects]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // ── PixiJS init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let mounted = true;
    const app = new PIXI.Application();

    app.init({ canvas, width: 860, height: 500, backgroundAlpha: 0, antialias: true }).then(async () => {
      if (!mounted) { app.destroy(); return; }
      appRef.current = app;

      let roomObjects = DEFAULT_OBJECTS;
      try {
        const loaded = await loadRoomJSON(ROOM_MAP_URL);
        if (loaded.length > 0) roomObjects = loaded;
      } catch { /* use defaults */ }

      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as { objects?: RoomObject[]; roomName?: string; happiness?: number; floor?: number; coins?: number; nextId?: number };
          if (parsed.objects?.length) roomObjects = parsed.objects;
          if (parsed.roomName) setRoomName(parsed.roomName);
          if (typeof parsed.happiness === "number") setHappiness(parsed.happiness);
          if (typeof parsed.floor === "number") setFloor(parsed.floor);
          if (typeof parsed.coins === "number") setCoins(parsed.coins);
          if (typeof parsed.nextId === "number") nextIdRef.current = parsed.nextId;
        }
      } catch { /* ignore */ }

      // Ensure nextIdRef is greater than any existing id
      const maxId = Math.max(...roomObjects.map(o => o.id), 999);
      if (nextIdRef.current <= maxId) nextIdRef.current = maxId + 1;

      setObjects(roomObjects);
      objectsRef.current = roomObjects;

      const scene = buildRoomScene(app.stage, roomObjects, {
        onSelect: (id) => {
          if (modeRef.current === "move") return;
          setSelectedId(prev => prev === id ? null : id);
        },
        onDragStart: (id, sx, sy) => {
          if (modeRef.current !== "move") return;
          if (!dragRef.current) {
            dragRef.current = { id, screenX: sx, screenY: sy };
          }
        },
      });
      sceneRef.current = scene;
      drawBackground(scene.backgroundGraphics);

      app.stage.on("pointermove", (e: PIXI.FederatedPointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        const dx = (e.global.x - drag.screenX) / scaleRef.current;
        const dy = (e.global.y - drag.screenY) / scaleRef.current;
        drag.screenX = e.global.x;
        drag.screenY = e.global.y;
        const [dwx, dwy] = worldDeltaFromScreen(dx, dy);
        const item = objectsRef.current.find(o => o.id === drag.id);
        if (!item) return;
        const nx = Math.max(0.3, Math.min(8.7, item.wx + dwx));
        const ny = Math.max(0.3, Math.min(6.7, item.wy + dwy));
        objectsRef.current = objectsRef.current.map(o =>
          o.id === drag.id ? { ...o, wx: nx, wy: ny } : o
        );
        scene.updateItem(drag.id, nx, ny, item.wz);
      });

      const endDrag = () => {
        if (!dragRef.current) return;
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

  // ── Scale / camera ───────────────────────────────────────────────────────────
  useEffect(() => {
    const updateScale = () => {
      const node = viewportRef.current;
      if (!node) return;
      const isMobile = node.clientWidth < 760;
      const sw = (node.clientWidth - (isMobile ? 20 : 52)) / 860;
      const sh = (node.clientHeight - (isMobile ? 68 : 160)) / 500;
      setScale(isMobile ? Math.max(0.68, Math.min(sw, sh, 0.96)) : Math.max(0.94, Math.min(sw, sh, 1.18)));
      setCameraY(isMobile ? 8 : 18);
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // ── Persist ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        objects, roomName, happiness, floor, coins, nextId: nextIdRef.current
      }));
    } catch { /* ignore */ }
  }, [objects, roomName, happiness, floor, coins]);

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const showToast = useCallback((text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleTrain = useCallback(() => {
    if (trainCount >= trainMax) {
      showToast("Training complete! Wait for refresh.");
      return;
    }
    setHappiness(h => h + 5);
    setCoins(c => c + TRAIN_REWARD);
    setTrainCount(t => t + 1);
    showToast(`+${TRAIN_REWARD} 🪙  +5 😊`);
  }, [trainCount, trainMax, showToast]);

  const handlePurchase = useCallback((item: CatalogItem) => {
    setCoins(c => c - item.cost);
    const spawn = getDefaultSpawnPosition(item.type);
    const newId = nextIdRef.current++;
    const newObj: RoomObject = {
      id: newId,
      furnitureType: item.type,
      label: item.label,
      description: item.description,
      wx: spawn.wx, wy: spawn.wy, wz: spawn.wz,
      happiness: item.happiness,
      draggable: item.draggable,
    };
    objectsRef.current = [...objectsRef.current, newObj];
    sceneRef.current?.addItem(newObj);
    setObjects([...objectsRef.current]);
    setSelectedId(newId);
  }, []);

  const handleDelete = useCallback((id: number) => {
    objectsRef.current = objectsRef.current.filter(o => o.id !== id);
    sceneRef.current?.removeItem(id);
    setObjects([...objectsRef.current]);
    setSelectedId(null);
    showToast("Item removed");
  }, [showToast]);

  const handleReset = useCallback(async () => {
    if (!confirm("Reset room to default layout? Any custom items will be removed.")) return;
    let defaults = DEFAULT_OBJECTS;
    try {
      const loaded = await loadRoomJSON(ROOM_MAP_URL);
      if (loaded.length > 0) defaults = loaded;
    } catch { /* keep default */ }
    objectsRef.current = defaults;
    sceneRef.current?.rebuild(defaults);
    setObjects(defaults);
    setSelectedId(null);
    nextIdRef.current = Math.max(...defaults.map(o => o.id), 999) + 1;
    showToast("Room reset");
  }, [showToast]);

  const selectedObj = objects.find(o => o.id === selectedId) ?? null;
  const suppliesPct = Math.round((suppliesProgress / suppliesMax) * 100);
  const totalHappiness = happiness + objects.reduce((s, o) => s + o.happiness, 0);

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={viewportRef}
      className="relative flex-1 w-full overflow-hidden"
      style={{ minHeight: "calc(100vh - 92px)", background: "linear-gradient(180deg,#d4e8f5 0%,#b8d4e8 40%,#a0c4de 100%)" }}
    >
      {/* ── Top-left: Back + Room name ───────────────────────────────── */}
      <div className="absolute left-3 top-3 z-30 flex items-center gap-2">
        <button type="button" onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c8a870] bg-[#f5e4c0] text-[#5a3c18] shadow-md hover:bg-[#f0d8a8] active:scale-95 transition">←</button>
        <div className="flex items-center gap-1.5 rounded-2xl border border-[#c8a870] bg-[#f5e4c0]/90 px-3 py-2 shadow-md backdrop-blur-sm">
          {mode === "move" ? (
            <input className="bg-transparent text-[13px] font-bold text-[#5a3c18] outline-none w-32"
              value={roomName} onChange={e => setRoomName(e.target.value)} />
          ) : (
            <span className="text-[13px] font-bold text-[#5a3c18]">{roomName}</span>
          )}
          <button type="button" onClick={() => setMode(m => m === "visit" ? "move" : "visit")}
            className="text-[#8b5e30] hover:text-[#5a3c18] transition text-[12px]">✏</button>
        </div>
      </div>

      {/* ── Top-right: Happiness + Coins + Floor + Timer ─────────────── */}
      <div className="absolute right-3 top-3 z-30 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-[#c8a870] bg-[#f5e4c0]/90 px-3 py-1.5 shadow-md backdrop-blur-sm">
            <span className="text-[12px] font-bold text-[#5a3c18]">{totalHappiness}</span>
            <span className="text-[14px]">😊</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-[#e8b800] bg-[#fde68a]/90 px-3 py-1.5 shadow-md backdrop-blur-sm">
            <span className="text-[12px] font-black text-[#7a5000]">{coins.toLocaleString()}</span>
            <span className="text-[14px]">🪙</span>
          </div>
          <button type="button" onClick={() => setFloor(f => f === 1 ? 2 : 1)}
            className="flex items-center gap-1 rounded-xl border border-[#c8a870] bg-[#f5e4c0]/90 px-2.5 py-1.5 shadow-md backdrop-blur-sm hover:bg-[#f0d8a8] transition">
            <span className="text-[10px] text-[#8b5e30]">✦</span>
            <span className="text-[12px] font-bold text-[#5a3c18]">{floor}F</span>
            <span className="text-[10px] text-[#8b5e30]">✦</span>
          </button>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-[#c8a870] bg-[#f5e4c0]/90 px-2.5 py-1 shadow-md backdrop-blur-sm">
          <span className="text-[14px]">🍱</span>
          <span className="text-[11px] font-mono font-bold text-[#5a3c18]">{timer}</span>
        </div>
      </div>

      {/* ── Move-mode banner ────────────────────────────────────────── */}
      {mode === "move" && (
        <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2 flex items-center gap-2 rounded-full border border-[#e8b800] bg-[#fde68a] px-4 py-1.5 shadow-md">
          <span className="text-[11px] font-black text-[#7a5000]">✋ Move Mode — drag furniture to reposition</span>
          <button type="button" onClick={handleReset}
            className="rounded-full bg-[#e84040] px-2.5 py-0.5 text-[9px] font-black text-white hover:bg-[#d03030] active:scale-95 transition">
            ↻ Reset
          </button>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div className="absolute left-1/2 top-16 z-40 -translate-x-1/2 rounded-full bg-[#fdf6e8] border border-[#c8a870] px-4 py-1.5 shadow-lg animate-pulse">
          <span className="text-[11px] font-black text-[#5a3c18]">{toast}</span>
        </div>
      )}

      {/* ── Online count ─────────────────────────────────────────────── */}
      {mode === "visit" && counts.active > 0 && (
        <div className="absolute right-3 top-[92px] z-20 rounded-full border border-[#c8a870] bg-[#f5e4c0]/80 px-3 py-1 text-[10px] font-semibold text-[#5a3c18] backdrop-blur-sm shadow">
          On stage {counts.active}
        </div>
      )}

      {/* ── Room canvas ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative" style={{ width:860, height:500, transform:`translateY(${cameraY}px) scale(${scale})`, transformOrigin:"center center" }}>
          <canvas ref={canvasRef} width={860} height={500} className="absolute inset-0" />

          <div className="absolute inset-0 z-30 pointer-events-none">
            {CHARACTERS.map(ch => {
              const live = presence[ch.id];
              const isSleeping = live?.state === "idle" && (live.idleTier === "resting" || live.idleTier === "offline");
              const isProcessing = live?.state === "processing";
              return (
                <CharacterSpot key={ch.id} {...ch} characterId={ch.id}
                  imagePath={resolveCharacterMoodImagePath(ch.id, live?.mood ?? "idle")}
                  sleep={isSleeping}
                  dotBg={isSleeping?"#334155":isProcessing?"#4ade80":ch.dotBg}
                  dotFg={isSleeping?"#64748b":isProcessing?"#052e16":ch.dotFg}
                  dotText={isSleeping?"z":isProcessing?"●":ch.dotText}
                  onClick={() => router.push(`/stages?character=${ch.id}`)}
                />
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

      {/* ── Bottom-left: Train + Supplies ───────────────────────────── */}
      <div className="absolute left-3 bottom-4 z-30 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleTrain}
            disabled={trainCount >= trainMax}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-white shadow-lg active:scale-95 transition ${
              trainCount >= trainMax ? "bg-[#a0a0a0] cursor-not-allowed" : "bg-[#e84040] hover:bg-[#d03030]"
            }`}>
            <span className="text-[13px] font-black">Train</span>
          </button>
          <div className="flex items-center gap-1">
            <span className="text-[13px] font-bold text-[#3a1a00]">{trainCount}/{trainMax}</span>
            <span className="h-2.5 w-2.5 rounded-full bg-[#e84040]" />
          </div>
        </div>
        <div className="rounded-2xl border border-[#c8a870] bg-[#f5e4c0]/90 px-3 py-2 shadow-md backdrop-blur-sm min-w-[200px]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f5c518] text-[10px] font-black text-[#5a3c00] shadow">+</span>
            <span className="text-[10px] font-bold text-[#5a3c18]">Supplies</span>
            <span className="text-[9px] text-[#8b5e30]">Time left:</span>
            <span className="text-[9px] font-mono font-bold text-[#2a7a30]">{suppliesTimer}</span>
          </div>
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-[#e8d0a0]">
            <div className="absolute inset-y-0 left-0 rounded-full bg-[#e84040] transition-all" style={{ width:`${suppliesPct}%` }} />
          </div>
          <div className="mt-0.5 text-center text-[9px] font-bold text-[#5a3c18]">
            {suppliesProgress.toLocaleString()}/{suppliesMax.toLocaleString()}
          </div>
        </div>
      </div>

      {/* ── Bottom-right: Action buttons ────────────────────────────── */}
      <div className="absolute right-3 bottom-4 z-30 flex items-end gap-2">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode(m => m === "visit" ? "move" : "visit")}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl border px-3 py-2 shadow-md active:scale-95 transition min-w-[56px] ${mode==="move"?"border-[#e8b800] bg-[#fde68a] text-[#7a5000]":"border-[#c8a870] bg-[#f5e4c0]/90 text-[#5a3c18] hover:bg-[#f0d8a8]"}`}>
              <span className="text-[18px]">🪑</span>
              <span className="text-[9px] font-bold">{mode === "move" ? "Done" : "Move"}</span>
            </button>
            <button type="button" onClick={() => setShopOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-[#e89830] bg-[#fad090]/90 px-3 py-2 shadow-md hover:bg-[#fac070] active:scale-95 transition min-w-[56px]">
              <span className="text-[18px]">🏪</span>
              <span className="text-[9px] font-bold text-[#7a4000]">Shop</span>
            </button>
            <button type="button"
              className="flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-[#4a8acc] bg-[#b8d8f0]/90 px-3 py-2 shadow-md hover:bg-[#a0c8e8] active:scale-95 transition min-w-[56px]">
              <span className="text-[18px]">☁️</span>
              <span className="text-[9px] font-bold text-[#1a4870]">Share</span>
            </button>
          </div>
        </div>
        <button type="button" onClick={() => setFloor(f => f === 1 ? 2 : 1)}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-[#c8a870] bg-[#f5e4c0]/90 px-3 py-3 shadow-md hover:bg-[#f0d8a8] active:scale-95 transition h-[84px] min-w-[64px]">
          <span className="text-[20px]">🪜</span>
          <span className="text-[9px] font-bold text-[#5a3c18] text-center leading-tight">Change<br />Floors</span>
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
