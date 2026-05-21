'use client';
import { proj } from './roomDraw';

type Props = {
  wx: number; wy: number; wz: number;
  emoji: string;
  bg: string; bc: string; gc: string; gs: number; fs: number; sz: number;
  animClass: 'fw' | 'fi' | 'fl' | 'fs';
  dotBg: string; dotFg: string; dotText: string;
  name: string; role: string;
  sleep?: boolean;
  onClick?: () => void;
};

export function CharacterSpot({ wx, wy, wz, emoji, bg, bc, gc, gs, fs, sz, animClass, dotBg, dotFg, dotText, name, role, sleep, onClick }: Props) {
  const [sx, sy] = proj(wx, wy, wz);
  return (
    <div
      className={`${animClass} absolute flex flex-col items-center gap-1 cursor-pointer group`}
      style={{ left: sx, top: sy, transform: 'translateX(-50%) translateY(-100%)' }}
      onClick={onClick}
    >
      <div
        className="rounded-full flex items-center justify-center relative overflow-hidden transition-transform duration-200 group-hover:-translate-y-1 group-hover:scale-105"
        style={{
          width: sz, height: sz, fontSize: fs,
          background: bg,
          border: `3px solid ${bc}`,
          boxShadow: `0 6px 20px rgba(0,0,0,0.6), 0 0 ${gs}px ${gc}`,
          filter: sleep ? 'brightness(0.55) saturate(0.4)' : undefined,
        }}
      >
        {emoji}
        <span
          className="absolute bottom-px right-px flex items-center justify-center rounded-full border-2 border-[#07041a]"
          style={{ width: 14, height: 14, background: dotBg, color: dotFg, fontSize: 6, fontWeight: 900 }}
        >
          {dotText}
        </span>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 bg-[rgba(5,2,14,0.94)] border border-white/14 rounded-lg px-2.5 py-1 text-[9px] font-bold text-[#f0abfc] whitespace-nowrap text-center pointer-events-none">
        {name}
        <span className="block text-white/38 text-[8px] font-normal">{role}</span>
      </div>
    </div>
  );
}
