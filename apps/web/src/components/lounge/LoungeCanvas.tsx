'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { drawRoom } from './roomDraw';
import { useTimeTheme } from './useTimeTheme';
import { CharacterSpot } from './CharacterSpot';

const CHARACTERS = [
  { id:'mai',   wx:1.5, wy:.22,wz:1.3, emoji:'🐱', bg:'linear-gradient(135deg,#ffd8ec,#e9b0f0,#c8a8e8)', bc:'#f0abfc', gc:'rgba(240,171,252,.5)', gs:22, fs:24, sz:58, animClass:'fw' as const, dotBg:'#4ade80', dotFg:'#052e16', dotText:'●', name:'Mai', role:'Frontend · 🤔' },
  { id:'ren',   wx:8.2, wy:.22,wz:1.1, emoji:'⚔️', bg:'linear-gradient(135deg,#a8f0c8,#6ee7b7,#60a5fa)', bc:'#4ade80', gc:'rgba(74,222,128,.4)', gs:18, fs:22, sz:52, animClass:'fw' as const, dotBg:'#4ade80', dotFg:'#052e16', dotText:'●', name:'Ren', role:'Backend · 💪' },
  { id:'yui',   wx:3.95,wy:3.0, wz:1.55,emoji:'📖', bg:'linear-gradient(135deg,#fef9c3,#fde68a,#f59e0b)', bc:'#fde047', gc:'rgba(253,224,71,.45)', gs:24, fs:28, sz:66, animClass:'fl' as const, dotBg:'#fde047', dotFg:'#713f12', dotText:'★', name:'Yui', role:'Lead · 👑' },
  { id:'mika',  wx:2.62,wy:2.4, wz:1.1, emoji:'🌸', bg:'linear-gradient(135deg,#ede9fe,#ddd6fe,#a78bfa)', bc:'#a78bfa', gc:'rgba(167,139,250,.3)', gs:14, fs:18, sz:46, animClass:'fi' as const, dotBg:'#94a3b8', dotFg:'#0f172a', dotText:'○', name:'Mika', role:'UI · 😊' },
  { id:'aki',   wx:6.62,wy:2.05,wz:1.0, emoji:'🔧', bg:'linear-gradient(135deg,#fed7aa,#fdba74,#fb923c)', bc:'#fb923c', gc:'rgba(251,146,60,.28)', gs:14, fs:18, sz:46, animClass:'fi' as const, dotBg:'#94a3b8', dotFg:'#0f172a', dotText:'○', name:'Aki', role:'DevOps · 😊' },
  { id:'senko', wx:6.9, wy:3.62,wz:1.28,emoji:'🦊', bg:'linear-gradient(135deg,#fde68a,#fcd34d,#fca5a5)', bc:'rgba(148,163,184,.22)', gc:'transparent', gs:0, fs:16, sz:42, animClass:'fs' as const, dotBg:'#334155', dotFg:'#64748b', dotText:'z', name:'Senko', role:'Support · 😴', sleep:true },
  { id:'shin',  wx:8.12,wy:4.68,wz:1.3, emoji:'🗡️', bg:'linear-gradient(135deg,#ddd6fe,#c4b5fd,#8b5cf6)', bc:'rgba(148,163,184,.22)', gc:'transparent', gs:0, fs:16, sz:42, animClass:'fs' as const, dotBg:'#334155', dotFg:'#64748b', dotText:'z', name:'Shinobu', role:'Strategist · 😴', sleep:true },
];

export function LoungeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme, themeName } = useTimeTheme();
  const router = useRouter();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try { drawRoom(ctx, theme, themeName); } catch (e) { console.error('Lounge draw error:', e); }
  }, [theme, themeName]);

  return (
    <div className="relative w-[860px] h-[500px] overflow-hidden">
      <canvas ref={canvasRef} width={860} height={500} className="absolute inset-0" />
      <div className="absolute inset-0 pointer-events-none">
        {CHARACTERS.map(ch => (
          <CharacterSpot
            key={ch.id}
            {...ch}
            onClick={() => router.push(`/stages?character=${ch.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
