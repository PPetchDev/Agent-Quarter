import { LoungeCanvas } from '@/components/lounge/LoungeCanvas';

export default function LoungePage() {
  return (
    <main>
      <LoungeCanvas />
      <div className="flex items-center justify-between px-5 py-2 bg-[rgba(5,2,14,0.96)] border-t border-white/5">
        <div className="flex gap-1.5">
          {[
            { cls: 'bg-[rgba(74,222,128,0.1)] text-[#4ade80] border-[rgba(74,222,128,0.2)]', text: '● 3 active' },
            { cls: 'bg-white/7 text-[#f0abfc] border-white/12', text: '★ 1 lead' },
            { cls: 'bg-[rgba(148,163,184,0.1)] text-[#94a3b8] border-[rgba(148,163,184,0.18)]', text: '○ 2 idle  💤 2 sleeping' },
          ].map(({ cls, text }) => (
            <span key={text} className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${cls}`}>{text}</span>
          ))}
        </div>
        <span className="text-[9px] text-white/18">hover ตัวละคร · คลิกเพื่อเปิด Stage</span>
      </div>
    </main>
  );
}
