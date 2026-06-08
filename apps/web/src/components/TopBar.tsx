'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/lounge', label: '🏠 Lounge' },
  { href: '/stages', label: '💬 Stages' },
  { href: '/projects', label: '📋 Projects' },
];

export function TopBar() {
  const path = usePathname();
  return (
    <header className="flex items-center gap-3 px-5 py-2.5 bg-[rgba(5,2,14,0.96)] border-b border-white/7 backdrop-blur-md">
      <span className="text-xs font-black tracking-[3px] text-[#f0abfc] uppercase">
        ✦ <em className="not-italic text-[#c8a8e8]">SQUAD</em> ✧
      </span>
      <nav className="flex flex-1 justify-center gap-0.5">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-[10px] font-semibold px-3.5 py-1 rounded-lg transition-all ${
              path === href
                ? 'bg-white/8 text-[#f0abfc] border border-white/14'
                : 'text-[#3d3060] hover:text-[#7c6b99]'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 rounded-full bg-[rgba(74,222,128,0.1)] text-[#4ade80] border border-[rgba(74,222,128,0.2)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
        online
      </div>
    </header>
  );
}
