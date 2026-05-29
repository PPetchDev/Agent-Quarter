'use client';
import { useState, useEffect } from 'react';

function formatHMS(seconds: number): string {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Countdown timer that ticks every second. Returns a formatted HH:MM:SS string.
 * Pass `startSeconds` to set the initial value. Stops at 0.
 *
 * @example
 * const mealTimer   = useCountdown(8 * 3600 + 23 * 60 + 17);
 * const supplyTimer = useCountdown(12 * 3600 + 45 * 60 + 30);
 */
export function useCountdown(startSeconds: number): string {
  const [seconds, setSeconds] = useState(startSeconds);

  useEffect(() => {
    const id = setInterval(() => setSeconds((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  return formatHMS(seconds);
}
