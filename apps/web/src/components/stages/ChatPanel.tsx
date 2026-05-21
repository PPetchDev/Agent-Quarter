'use client';
import { useState, useEffect, useRef } from 'react';
import { useStageSocket } from '@/hooks/useStageSocket';
import { getHistory } from '@/lib/api';
import { CharacterAvatar } from './CharacterAvatar';
import { MessageBubble } from './MessageBubble';
import { CHARACTER_TEMPLATES } from '@squad/core';

type HistMsg = { id: string; role: string; content: string; mood?: string };

export function ChatPanel({ characterId }: { characterId: string }) {
  const { stageState, activeMood, chunks, sendMessage } = useStageSocket(characterId);
  const [history, setHistory]     = useState<HistMsg[]>([]);
  const [input, setInput]         = useState('');
  const [streaming, setStreaming] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const template  = CHARACTER_TEMPLATES.find(t => t.characterId === characterId)!;

  useEffect(() => {
    getHistory(characterId).then(msgs => setHistory(msgs.map(m => ({ ...m, id: m.id }))));
    setStreaming('');
  }, [characterId]);

  useEffect(() => {
    if (chunks.length === 0) { setStreaming(''); return; }
    setStreaming(chunks.map(c => c.chunk).join(''));
  }, [chunks]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, streaming]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setHistory(prev => [...prev, { id: Date.now().toString(), role: 'user', content: trimmed }]);
    sendMessage(trimmed);
    setInput('');
  };

  const isProcessing = stageState.state === 'processing';

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/7 bg-white/2">
        <CharacterAvatar characterId={characterId} mood={activeMood} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-black text-[#f0abfc]">{template.name}</p>
          <p className="text-[10px] flex items-center gap-1.5 text-white/50">
            {isProcessing
              ? <><span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />กำลังคิดอยู่...</>
              : <><span className="w-1.5 h-1.5 rounded-full bg-[#475569]" />{activeMood}</>
            }
          </p>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/7 text-[#a78bfa] border border-white/10">
          {activeMood}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {history.map(msg => (
          <MessageBubble
            key={msg.id}
            role={msg.role as 'user' | 'assistant'}
            content={msg.content}
            characterName={msg.role === 'assistant' ? `${template.name} · ${template.title}` : undefined}
          />
        ))}
        {streaming && (
          <MessageBubble
            role="assistant"
            content={streaming}
            characterName={`${template.name} กำลังพิมพ์...`}
            isStreaming
          />
        )}
        {isProcessing && !streaming && (
          <div className="flex gap-2">
            <div className="flex gap-1 px-3.5 py-2.5 bg-white/5 border border-white/8 rounded-2xl rounded-tl-sm">
              {[0,1,2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#c8a8e8] animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-white/7">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={`พิมพ์ข้อความถึง ${template.name}...`}
          rows={1}
          className="flex-1 resize-none bg-white/6 border border-white/14 rounded-xl px-3.5 py-2.5 text-[12px] text-[#e2d9f3] placeholder-white/25 outline-none focus:border-[rgba(240,171,252,0.4)] transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isProcessing}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-[#f0abfc] to-[#a78bfa] flex items-center justify-center text-sm shadow-lg disabled:opacity-40 hover:scale-105 active:scale-95 transition-transform flex-shrink-0"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
