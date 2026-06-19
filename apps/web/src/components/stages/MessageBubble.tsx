type Props = {
  role: 'user' | 'assistant';
  content: string;
  characterName?: string;
  isStreaming?: boolean;
};

export function MessageBubble({ role, content, characterName, isStreaming }: Props) {
  if (role === 'user') {
    return (
      <div className="flex gap-2 justify-end">
        <div className="max-w-[75%]">
          <p className="text-[9px] text-white/38 text-right mb-1">คุณ</p>
          <div className="bg-[rgba(124,58,237,0.35)] border border-[rgba(167,139,250,0.3)] rounded-2xl rounded-tr-sm px-3.5 py-2 text-[12px] text-[#e2d9f3] leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <div className="max-w-[80%]">
        {characterName && <p className="text-[9px] text-white/38 mb-1">{characterName}</p>}
        <div className="bg-[rgba(255,255,255,0.05)] border border-white/8 rounded-2xl rounded-tl-sm px-3.5 py-2 text-[12px] text-[#e2d9f3] leading-relaxed whitespace-pre-wrap">
          {content}
          {isStreaming && (
            <span className="inline-block w-1 h-3.5 bg-[#f0abfc] ml-0.5 animate-pulse rounded-sm" />
          )}
        </div>
      </div>
    </div>
  );
}
