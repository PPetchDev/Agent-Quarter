'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CharacterSidebar } from '@/components/stages/CharacterSidebar';
import { ChatPanel } from '@/components/stages/ChatPanel';

function StagesContent() {
  const searchParams = useSearchParams();
  const initial = searchParams.get('character') ?? 'mai';
  const [activeId, setActiveId] = useState(initial);

  return (
    <main className="flex-1 flex flex-col items-center bg-[rgba(7,4,26,0.8)]">
      <div className="w-full max-w-[860px] flex flex-1 border-x border-white/5">
        <CharacterSidebar activeId={activeId} onSelect={setActiveId} />
        <ChatPanel characterId={activeId} />
      </div>
    </main>
  );
}

export default function StagesPage() {
  return (
    <Suspense>
      <StagesContent />
    </Suspense>
  );
}
