"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { proj } from "./pixiRoom";

const stickerCache = new Map<string, string>();

async function buildStickerCutout(src: string): Promise<string> {
  if (typeof window === "undefined") return src;
  if (stickerCache.has(src)) return stickerCache.get(src)!;

  const img = new window.Image();
  img.decoding = "async";
  img.src = src;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return src;

  ctx.drawImage(img, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = frame.data;

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i]!;
    const g = px[i + 1]!;
    const b = px[i + 2]!;
    const a = px[i + 3]!;
    if (a === 0) continue;

    const nearWhite = r > 230 && g > 230 && b > 230;
    const lowSaturation = Math.max(r, g, b) - Math.min(r, g, b) < 18;
    if (nearWhite && lowSaturation) {
      px[i + 3] = 0;
      continue;
    }

    const brightEdge = r > 210 && g > 210 && b > 210;
    if (brightEdge && lowSaturation) {
      px[i + 3] = Math.max(0, a - 95);
    }
  }

  ctx.putImageData(frame, 0, 0);
  const out = canvas.toDataURL("image/png");
  stickerCache.set(src, out);
  return out;
}

type Props = {
  characterId: string;
  imagePath: string;
  wx: number;
  wy: number;
  wz: number;
  bc: string;
  gc: string;
  gs: number;
  sz: number;
  animClass: "fw" | "fi" | "fl" | "fs";
  dotBg: string;
  dotFg: string;
  dotText: string;
  name: string;
  role: string;
  sleep?: boolean;
  priority?: boolean;
  statusLabel?: string;
  statusTone?: "idle" | "thinking" | "typing" | "sleeping";
  onClick?: () => void;
};

export function CharacterSpot({
  characterId,
  imagePath,
  wx,
  wy,
  wz,
  bc,
  gc,
  gs,
  sz,
  animClass,
  dotBg,
  dotFg,
  dotText,
  name,
  role,
  sleep,
  priority = false,
  statusLabel,
  statusTone = "idle",
  onClick,
}: Props) {
  const [sx, sy] = proj(wx, wy, wz);
  const camTag = `${name.toUpperCase()} CAM`;
  const standeeW = Math.round(sz * 1.08);
  const standeeH = Math.round(sz * 1.38);
  const [cutoutSrc, setCutoutSrc] = useState(imagePath);

  useEffect(() => {
    let active = true;
    buildStickerCutout(imagePath)
      .then((result) => {
        if (!active) return;
        setCutoutSrc(result);
      })
      .catch(() => {
        if (!active) return;
        setCutoutSrc(imagePath);
      });

    return () => {
      active = false;
    };
  }, [imagePath]);

  return (
    <div
      className={`${animClass} absolute z-30 flex flex-col items-center gap-1 cursor-pointer group pointer-events-auto`}
      style={{
        left: sx,
        top: sy,
        transform: "translateX(-50%) translateY(-100%)",
      }}
      onClick={onClick}
    >
      <div
        className="rounded-[999px] bg-black/25 blur-[2px]"
        style={{
          width: sz * 0.52,
          height: Math.max(7, sz * 0.14),
          transform: `translateY(${Math.round(standeeH * 0.82)}px)`,
        }}
      />
      <div
        className="flex items-center justify-center relative overflow-visible transition-transform duration-200 group-hover:-translate-y-1 group-hover:scale-105"
        style={{
          width: standeeW,
          height: standeeH,
          boxShadow: `0 10px 16px rgba(0,0,0,0.22), 0 0 ${gs}px ${gc}`,
          filter: sleep ? "brightness(0.55) saturate(0.4)" : undefined,
        }}
      >
        <Image
          src={cutoutSrc}
          alt={`${name} sticker`}
          width={standeeW}
          height={standeeH}
          className="h-full w-full object-contain object-bottom"
          unoptimized={cutoutSrc.startsWith("data:image")}
          priority={priority && !cutoutSrc.startsWith("data:")}
          style={{ filter: "drop-shadow(0 2px 1px rgba(0,0,0,0.22))" }}
        />
        <span
          className="absolute bottom-1 right-0 flex items-center justify-center rounded-full border-2 border-[#0d173e]"
          style={{
            width: 15,
            height: 15,
            background: dotBg,
            color: dotFg,
            fontSize: 7,
            fontWeight: 900,
          }}
        >
          {dotText}
        </span>
      </div>
      <div
        title={`${characterId} · ${role}`}
        className="rounded-full border border-[#d7e4ff] bg-[rgba(248,252,255,0.96)] px-2.5 py-0.5 text-[8px] font-black tracking-[0.35px] text-[#29407f] whitespace-nowrap text-center pointer-events-none shadow-[0_6px_14px_rgba(0,0,0,0.2)] -mt-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      >
        {camTag}
      </div>
      {statusLabel && (
        <div
          className="rounded-full border px-2 py-[2px] text-[7px] font-black tracking-[0.2px] text-center pointer-events-none"
          style={{
            background:
              statusTone === "typing"
                ? "rgba(187,247,208,0.95)"
                : statusTone === "thinking"
                  ? "rgba(254,243,199,0.95)"
                  : statusTone === "sleeping"
                    ? "rgba(203,213,225,0.92)"
                    : "rgba(226,232,240,0.92)",
            borderColor:
              statusTone === "typing"
                ? "#22c55e"
                : statusTone === "thinking"
                  ? "#f59e0b"
                  : statusTone === "sleeping"
                    ? "#64748b"
                    : "#94a3b8",
            color:
              statusTone === "typing"
                ? "#14532d"
                : statusTone === "thinking"
                  ? "#78350f"
                  : statusTone === "sleeping"
                    ? "#334155"
                    : "#334155",
          }}
        >
          {statusLabel}
        </div>
      )}
    </div>
  );
}
