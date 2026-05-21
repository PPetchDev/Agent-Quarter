import type { Metadata } from 'next';
import './globals.css';
import { TopBar } from '@/components/TopBar';

export const metadata: Metadata = { title: '✦ Anime Agent Squad ✧' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-screen">
        <div className="max-w-[860px] mx-auto">
          <TopBar />
          {children}
        </div>
      </body>
    </html>
  );
}
