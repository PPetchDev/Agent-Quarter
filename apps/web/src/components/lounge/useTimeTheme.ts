'use client';
import { useMemo } from 'react';
import { THEMES, pickThemeName, type RoomTheme } from './themes';

export function useTimeTheme(): { theme: RoomTheme; themeName: string } {
  return useMemo(() => {
    const hour = new Date().getHours();
    const themeName = pickThemeName(hour);
    return { theme: THEMES[themeName]!, themeName };
  }, []);
}
