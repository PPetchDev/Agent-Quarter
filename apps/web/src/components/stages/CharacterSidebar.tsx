'use client';
import { CHARACTER_TEMPLATES } from '@squad/core';
import { CharacterAvatar } from './CharacterAvatar';
import { useStageSocket } from '@/hooks/useStageSocket';

function SidebarEntry({ characterId, isActive, onSelect }: { characterId: string; isActive: boolean; onSelect: () => void }) {
  const { activeMood, stageState } = useStageSocket(characterId);
  const template = CHARACTER_TEMPLATES.find(t => t.characterId === characterId)!;

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-all text-left ${
        isActive
          ? 'bg-[rgba(255,255,255,0.08)] border-white/14'
          : 'border-transparent hover:bg-white/4'
      }`}
    >
      <div className="relative flex-shrink-0">
        <CharacterAvatar characterId={characterId} mood={activeMood} size="sm" />
        <span
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#07041a]"
          style={{ background: stageState.state === 'processing' ? '#4ade80' : '#475569' }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[11px] font-bold truncate ${isActive ? 'text-[#f0abfc]' : 'text-[#e2d9f3]'}`}>
          {template.name}
        </p>
        <p className="text-[9px] text-white/38 uppercase tracking-wide truncate">{template.title}</p>
        <span className="inline-block mt-0.5 text-[8px] px-1.5 py-0 rounded-full bg-white/7 text-white/50">
          {activeMood}
        </span>
      </div>
    </button>
  );
}

export function CharacterSidebar({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }) {
  return (
    <aside className="w-[200px] flex-shrink-0 bg-[rgba(5,2,14,0.6)] border-r border-white/7 p-2.5 flex flex-col gap-1 overflow-y-auto">
      <p className="text-[9px] font-black tracking-[2.5px] text-white/30 uppercase px-2 py-1.5 mb-1">
        ✦ SQUAD ✧
      </p>
      {CHARACTER_TEMPLATES.map(t => (
        <SidebarEntry
          key={t.characterId}
          characterId={t.characterId}
          isActive={t.characterId === activeId}
          onSelect={() => onSelect(t.characterId)}
        />
      ))}
    </aside>
  );
}
