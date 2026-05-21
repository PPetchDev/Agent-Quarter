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
    <main className="flex h-[538px] bg-[rgba(7,4,26,0.8)] border-t border-white/5">
      <CharacterSidebar activeId={activeId} onSelect={setActiveId} />
      <ChatPanel characterId={activeId} />
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
