"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as PIXI from "pixi.js";
import { drawPixiRoom, proj, worldDeltaFromScreen } from "./pixiRoom";
import { CharacterSpot } from "./CharacterSpot";
import { resolveCharacterMoodImagePath } from "@squad/core";
import { useLoungePresence } from "@/hooks/useLoungePresence";

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = "visit" | "edit";

type DecorItem = {
  id: string;
  label: string;
  icon: string;
  wx: number;
  wy: number;
  wz: number;
  color: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const SNAP_STEP = 0.25;
const STORAGE_STATE_KEY = "squad:lounge:state:v2";

const CHARACTERS = [
  {
    id: "mai",
    mood: "01-idle",
    wx: 1.42,
    wy: 0.28,
    wz: 1.34,
    bc: "#f7adc9",
    gc: "rgba(247,173,201,.45)",
    gs: 20,
    sz: 52,
    animClass: "fw" as const,
    dotBg: "#4ade80",
    dotFg: "#052e16",
    dotText: "●",
    name: "Mai",
    role: "Frontend · coding",
  },
  {
    id: "ren",
    mood: "01-idle",
    wx: 8.05,
    wy: 0.22,
    wz: 1.14,
    bc: "#5bd49b",
    gc: "rgba(91,212,155,.4)",
    gs: 18,
    sz: 47,
    animClass: "fw" as const,
    dotBg: "#4ade80",
    dotFg: "#052e16",
    dotText: "●",
    name: "Ren",
    role: "Backend · guarding",
  },
  {
    id: "yui",
    mood: "01-idle",
    wx: 3.2,
    wy: 4.9,
    wz: 1.6,
    bc: "#f5c65e",
    gc: "rgba(245,198,94,.5)",
    gs: 24,
    sz: 60,
    animClass: "fl" as const,
    dotBg: "#fde047",
    dotFg: "#713f12",
    dotText: "★",
    name: "Yui",
    role: "Lead · reviewing",
  },
  {
    id: "mika",
    mood: "01-idle",
    wx: 2.62,
    wy: 2.42,
    wz: 1.1,
    bc: "#c0acef",
    gc: "rgba(192,172,239,.34)",
    gs: 14,
    sz: 44,
    animClass: "fi" as const,
    dotBg: "#94a3b8",
    dotFg: "#0f172a",
    dotText: "○",
    name: "Mika",
    role: "UI · sketching",
  },
  {
    id: "aki",
    mood: "01-idle",
    wx: 6.6,
    wy: 2.06,
    wz: 1.0,
    bc: "#f4b16a",
    gc: "rgba(244,177,106,.3)",
    gs: 14,
    sz: 44,
    animClass: "fi" as const,
    dotBg: "#94a3b8",
    dotFg: "#0f172a",
    dotText: "○",
    name: "Aki",
    role: "DevOps · tuning",
  },
  {
    id: "senko",
    mood: "07-sleepy",
    wx: 6.94,
    wy: 3.64,
    wz: 1.28,
    bc: "rgba(148,163,184,.24)",
    gc: "transparent",
    gs: 0,
    sz: 40,
    animClass: "fs" as const,
    dotBg: "#334155",
    dotFg: "#64748b",
    dotText: "z",
    name: "Senko",
    role: "Support · sleeping",
    sleep: true,
  },
  {
    id: "shinobu",
    mood: "07-sleepy",
    wx: 8.1,
    wy: 4.66,
    wz: 1.32,
    bc: "rgba(148,163,184,.24)",
    gc: "transparent",
    gs: 0,
    sz: 40,
    animClass: "fs" as const,
    dotBg: "#334155",
    dotFg: "#64748b",
    dotText: "z",
    name: "Shinobu",
    role: "Strategist · sleeping",
    sleep: true,
  },
];

const BASE_DECOR: DecorItem[] = [
  { id: "plant-a", label: "Fern", icon: "🪴", wx: 0.9, wy: 6.1, wz: 0.62, color: "#6bcf8f" },
  { id: "jukebox", label: "Jukebox", icon: "🎵", wx: 2.8, wy: 1.1, wz: 1.2, color: "#ffb8d6" },
  { id: "snack", label: "Snacks", icon: "🍩", wx: 4.2, wy: 4.8, wz: 1.05, color: "#ffd28f" },
];

function snap(v: number) {
  return Math.round(v / SNAP_STEP) * SNAP_STEP;
}

function useTimer(startSeconds = 8 * 3600 + 23 * 60 + 17) {
  const [secs, setSecs] = useState(startSeconds);
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(secs / 3600).toString().padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function useSuppliesTimer(startSeconds = 12 * 3600 + 45 * 60 + 30) {
  const [secs, setSecs] = useState(startSeconds);
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(secs / 3600).toString().padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function LoungeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const roomGRef = useRef<PIXI.Graphics | null>(null);
  const dragStateRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const router = useRouter();
  const { presence, counts } = useLoungePresence();

  const [mode, setMode] = useState<Mode>("visit");
  const [decor, setDecor] = useState<DecorItem[]>(BASE_DECOR);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [scale, setScale] = useState(1);
  const [cameraY, setCameraY] = useState(20);
  const [roomName, setRoomName] = useState("Maple Hideout");
  const [happiness, setHappiness] = useState(128);
  const [floor, setFloor] = useState(1);
  const [trainCount] = useState(2);
  const [trainMax] = useState(4);
  const [suppliesProgress] = useState(28640);
  const [suppliesMax] = useState(40000);

  const timer = useTimer();
  const suppliesTimer = useSuppliesTimer();

  // ── PixiJS init ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let mounted = true;
    const app = new PIXI.Application();

    app
      .init({
        canvas,
        width: 860,
        height: 500,
        backgroundAlpha: 0,
        antialias: true,
      })
      .then(() => {
        if (!mounted) {
          app.destroy();
          return;
        }
        const g = new PIXI.Graphics();
        app.stage.addChild(g);
        roomGRef.current = g;
        appRef.current = app;
        drawPixiRoom(g);
      });

    return () => {
      mounted = false;
      appRef.current?.destroy();
      appRef.current = null;
      roomGRef.current = null;
    };
  }, []);

  // ── Scale + camera ─────────────────────────────────────────────────────────
  useEffect(() => {
    const updateScale = () => {
      const node = viewportRef.current;
      if (!node) return;
      const roomW = 860,
        roomH = 500;
      const isMobile = node.clientWidth < 760;
      const paddingX = isMobile ? 10 : 26;
      const paddingY = isMobile ? 34 : 80;
      const sw = (node.clientWidth - paddingX * 2) / roomW;
      const sh = (node.clientHeight - paddingY * 2) / roomH;
      const nextScale = isMobile
        ? Math.max(0.68, Math.min(sw, sh, 0.96))
        : Math.max(0.94, Math.min(sw, sh, 1.18));
      setScale(nextScale);
      setCameraY(isMobile ? 8 : 18);
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // ── Persist state ──────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.decor) setDecor(parsed.decor);
        if (parsed.roomName) setRoomName(parsed.roomName);
        if (typeof parsed.happiness === "number") setHappiness(parsed.happiness);
        if (typeof parsed.floor === "number") setFloor(parsed.floor);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify({ decor, roomName, happiness, floor }));
    } catch {}
  }, [decor, roomName, happiness, floor]);

  // ── Drag-to-reposition decor ───────────────────────────────────────────────
  useEffect(() => {
    const onMove = (ev: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag || mode !== "edit") return;
      const dx = (ev.clientX - drag.x) / scale;
      const dy = (ev.clientY - drag.y) / scale;
      dragStateRef.current = { ...drag, x: ev.clientX, y: ev.clientY };
      const [dwx, dwy] = worldDeltaFromScreen(dx, dy);
      setDecor((prev) =>
        prev.map((item) => {
          if (item.id !== drag.id) return item;
          const nx = Math.max(0.35, Math.min(8.55, item.wx + dwx));
          const ny = Math.max(0.35, Math.min(6.55, item.wy + dwy));
          return { ...item, wx: snapEnabled ? snap(nx) : nx, wy: snapEnabled ? snap(ny) : ny };
        }),
      );
    };
    const onUp = () => { dragStateRef.current = null; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [mode, scale, snapEnabled]);

  const handleTrain = useCallback(() => {
    setHappiness((h) => h + 5);
  }, []);

  const suppliesPct = Math.round((suppliesProgress / suppliesMax) * 100);

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={viewportRef}
      className="relative flex-1 w-full overflow-hidden"
      style={{
        minHeight: "calc(100vh - 92px)",
        background: "linear-gradient(180deg, #d4e8f5 0%, #b8d4e8 40%, #a0c4de 100%)",
      }}
    >
      {/* ── Top-left: Back + Room name ──────────────────────────────────────── */}
      <div className="absolute left-3 top-3 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c8a870] bg-[#f5e4c0] text-[#5a3c18] shadow-md hover:bg-[#f0d8a8] active:scale-95 transition"
        >
          ←
        </button>
        <div className="flex items-center gap-1.5 rounded-2xl border border-[#c8a870] bg-[#f5e4c0]/90 px-3 py-2 shadow-md backdrop-blur-sm">
          {mode === "edit" ? (
            <input
              className="bg-transparent text-[13px] font-bold text-[#5a3c18] outline-none w-32"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          ) : (
            <span className="text-[13px] font-bold text-[#5a3c18]">{roomName}</span>
          )}
          <button
            type="button"
            onClick={() => setMode((m) => (m === "visit" ? "edit" : "visit"))}
            className="text-[#8b5e30] hover:text-[#5a3c18] transition text-[12px]"
          >
            ✏
          </button>
        </div>
      </div>

      {/* ── Top-right: Happiness + Floor ────────────────────────────────────── */}
      <div className="absolute right-3 top-3 z-30 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-[#c8a870] bg-[#f5e4c0]/90 px-3 py-1.5 shadow-md backdrop-blur-sm">
            <span className="text-[12px] font-bold text-[#5a3c18]">Happiness: {happiness}</span>
            <span className="text-[14px]">😊</span>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-[#c8a870] bg-[#f5e4c0]/90 px-2.5 py-1.5 shadow-md backdrop-blur-sm">
            <span className="text-[10px] text-[#8b5e30]">✦</span>
            <button
              type="button"
              onClick={() => setFloor((f) => (f === 1 ? 2 : 1))}
              className="text-[12px] font-bold text-[#5a3c18] hover:text-[#3a1a00] transition"
            >
              {floor}F
            </button>
            <span className="text-[10px] text-[#8b5e30]">✦</span>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-1.5 rounded-xl border border-[#c8a870] bg-[#f5e4c0]/90 px-2.5 py-1 shadow-md backdrop-blur-sm">
          <span className="text-[14px]">🍱</span>
          <span className="text-[11px] font-mono font-bold text-[#5a3c18]">{timer}</span>
        </div>
      </div>

      {/* ── Edit-mode controls ─────────────────────────────────────────────── */}
      {mode === "edit" && (
        <div className="absolute left-3 top-16 z-20 flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#c8a870] bg-[#f5e4c0]/90 px-2 py-2 shadow-md backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setSnapEnabled((s) => !s)}
            className={`rounded-full px-3 py-1 text-[10px] font-bold transition ${snapEnabled ? "bg-[#ffd982] text-[#5d4100]" : "bg-[#e8d0a0] text-[#8b5e30] hover:bg-[#f0d8b0]"}`}
          >
            Snap: {snapEnabled ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            onClick={() => setDecor(BASE_DECOR)}
            className="rounded-full bg-[#e8d0a0] px-3 py-1 text-[10px] font-bold text-[#8b5e30] hover:bg-[#f0d8b0]"
          >
            Reset Decor
          </button>
          <span className="text-[9px] text-[#8b5e30]">ลากไอเท็มได้</span>
        </div>
      )}

      {/* ── Visit-mode online count ────────────────────────────────────────── */}
      {mode === "visit" && counts.active > 0 && (
        <div className="absolute right-3 top-[88px] z-20 rounded-full border border-[#c8a870] bg-[#f5e4c0]/80 px-3 py-1 text-[10px] font-semibold text-[#5a3c18] backdrop-blur-sm shadow">
          On stage {counts.active}
        </div>
      )}

      {/* ── Room canvas ────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{
            width: 860,
            height: 500,
            transform: `translateY(${cameraY}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          {/* PixiJS canvas */}
          <canvas ref={canvasRef} width={860} height={500} className="absolute inset-0" />

          {/* Decor items (edit mode drag handles) */}
          <div className="absolute inset-0 z-10">
            {decor.map((item) => {
              if (mode !== "edit") return null;
              const [sx, sy] = proj(item.wx, item.wy, item.wz);
              return (
                <button
                  key={item.id}
                  type="button"
                  onPointerDown={(ev) => {
                    dragStateRef.current = { id: item.id, x: ev.clientX, y: ev.clientY };
                  }}
                  className="absolute -translate-x-1/2 -translate-y-full select-none border font-bold shadow-lg cursor-grab active:cursor-grabbing rounded-xl px-2 py-1 text-[10px]"
                  style={{ left: sx, top: sy, background: item.color, borderColor: "rgba(255,255,255,0.6)", color: "#1d2f67" }}
                >
                  {item.icon} {item.label}
                </button>
              );
            })}
          </div>

          {/* Character spots */}
          <div className="absolute inset-0 z-30 pointer-events-none">
            {CHARACTERS.map((ch) => {
              const live = presence[ch.id];
              const isSleeping = live?.state === "idle" && (live.idleTier === "resting" || live.idleTier === "offline");
              const isProcessing = live?.state === "processing";
              const imagePath = resolveCharacterMoodImagePath(ch.id, live?.mood ?? "idle");
              return (
                <CharacterSpot
                  key={ch.id}
                  {...ch}
                  characterId={ch.id}
                  imagePath={imagePath}
                  sleep={isSleeping}
                  dotBg={isSleeping ? "#334155" : isProcessing ? "#4ade80" : ch.dotBg}
                  dotFg={isSleeping ? "#64748b" : isProcessing ? "#052e16" : ch.dotFg}
                  dotText={isSleeping ? "z" : isProcessing ? "●" : ch.dotText}
                  onClick={() => router.push(`/stages?character=${ch.id}`)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom-left: Train + Supplies ──────────────────────────────────── */}
      <div className="absolute left-3 bottom-4 z-30 flex flex-col gap-2">
        {/* Train button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTrain}
            className="flex items-center gap-1.5 rounded-full bg-[#e84040] px-4 py-2 text-white shadow-lg hover:bg-[#d03030] active:scale-95 transition"
          >
            <span className="text-[13px] font-black">Train</span>
          </button>
          <div className="flex items-center gap-1">
            <span className="text-[13px] font-bold text-[#3a1a00]">{trainCount}/{trainMax}</span>
            <span className="h-2.5 w-2.5 rounded-full bg-[#e84040]" />
          </div>
        </div>

        {/* Supplies bar */}
        <div className="rounded-2xl border border-[#c8a870] bg-[#f5e4c0]/90 px-3 py-2 shadow-md backdrop-blur-sm min-w-[200px]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f5c518] text-[10px] font-black text-[#5a3c00] shadow">+</span>
            <span className="text-[10px] font-bold text-[#5a3c18]">Supplies</span>
            <span className="text-[9px] text-[#8b5e30]">Time left:</span>
            <span className="text-[9px] font-mono font-bold text-[#2a7a30]">{suppliesTimer}</span>
          </div>
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-[#e8d0a0]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[#e84040] transition-all"
              style={{ width: `${suppliesPct}%` }}
            />
          </div>
          <div className="mt-0.5 text-center text-[9px] font-bold text-[#5a3c18]">
            {suppliesProgress.toLocaleString()}/{suppliesMax.toLocaleString()}
          </div>
        </div>
      </div>

      {/* ── Bottom-right: Action buttons ────────────────────────────────────── */}
      <div className="absolute right-3 bottom-4 z-30 flex items-end gap-2">
        {/* Move / Shop / Share row */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode((m) => (m === "visit" ? "edit" : "visit"))}
              className="flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-[#c8a870] bg-[#f5e4c0]/90 px-3 py-2 shadow-md hover:bg-[#f0d8a8] active:scale-95 transition min-w-[56px]"
            >
              <span className="text-[18px]">🪑</span>
              <span className="text-[9px] font-bold text-[#5a3c18]">Move</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-[#e89830] bg-[#fad090]/90 px-3 py-2 shadow-md hover:bg-[#fac070] active:scale-95 transition min-w-[56px]"
            >
              <span className="text-[18px]">🏪</span>
              <span className="text-[9px] font-bold text-[#7a4000]">Shop</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-[#4a8acc] bg-[#b8d8f0]/90 px-3 py-2 shadow-md hover:bg-[#a0c8e8] active:scale-95 transition min-w-[56px]"
            >
              <span className="text-[18px]">☁️</span>
              <span className="text-[9px] font-bold text-[#1a4870]">Share</span>
            </button>
          </div>
        </div>

        {/* Change Floors button (tall) */}
        <button
          type="button"
          onClick={() => setFloor((f) => (f === 1 ? 2 : 1))}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-[#c8a870] bg-[#f5e4c0]/90 px-3 py-3 shadow-md hover:bg-[#f0d8a8] active:scale-95 transition h-[84px] min-w-[64px]"
        >
          <span className="text-[20px]">🪜</span>
          <span className="text-[9px] font-bold text-[#5a3c18] text-center leading-tight">
            Change<br />Floors
          </span>
        </button>
      </div>
    </div>
  );
}
