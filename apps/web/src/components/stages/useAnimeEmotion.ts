'use client';
import { useEffect, useRef } from 'react';
import type { CharacterMood } from '@squad/core';

const EMOTION_LOOP: Record<CharacterMood, object> = {
  idle: { translateY: [0, -6], duration: 3000 },
  thinking: { rotate: [-3, 3], duration: 2500 },
  happy: { translateY: [0, -10], scale: [1, 1.04], duration: 1200 },
  excited: { translateY: [0, -12], scale: [1, 1.06], duration: 700 },
  victory: { translateY: [0, -14], scale: [1, 1.08], rotate: [-3, 3], duration: 800 },
  crying: { translateY: [0, 4], rotate: [-2, 2], duration: 4000 },
  sleepy: { rotate: [-2, 2], duration: 5000 },
  angry: { translateY: [0, -3], duration: 800 },
  surprised: { scale: [1, 1.1], translateY: [0, -8], duration: 600 },
  listening: { translateY: [0, -5], duration: 3500 },
  love: { scale: [1, 1.05], translateY: [0, -8], duration: 1500 },
  snack: { translateY: [0, -4], rotate: [-1, 1], duration: 2000 },
  done: { translateY: [0, -8], duration: 2000 },
};

const EMOTION_BURST: Record<
  CharacterMood,
  { translateY?: number; scale?: number; rotate?: number; duration: number }
> = {
  idle: { translateY: -3, duration: 400 },
  thinking: { translateY: -2, duration: 400 },
  happy: { translateY: -12, scale: 1.1, duration: 350 },
  excited: { translateY: -18, scale: 1.15, duration: 300 },
  victory: { translateY: -20, scale: 1.2, rotate: 8, duration: 350 },
  crying: { translateY: 4, duration: 600 },
  sleepy: { translateY: 3, duration: 800 },
  angry: { scale: 1.05, duration: 200 },
  surprised: { scale: 1.25, translateY: -10, duration: 200 },
  listening: { translateY: -5, duration: 400 },
  love: { scale: 1.12, translateY: -10, duration: 350 },
  snack: { translateY: -6, duration: 400 },
  done: { translateY: -8, scale: 1.05, duration: 350 },
};

export function useAnimeEmotion(
  mood: CharacterMood,
  elementRef: React.RefObject<HTMLElement | null>,
) {
  const loopRef = useRef<{ pause: () => void } | null>(null);
  const prevMood = useRef<CharacterMood | null>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    let cancelled = false;

    import('animejs').then((mod) => {
      if (cancelled) return;
      const animate = mod.animate;
      loopRef.current?.pause();

      if (prevMood.current !== mood) {
        prevMood.current = mood;
        const burst = EMOTION_BURST[mood] ?? EMOTION_BURST.idle;
        animate(el, {
          translateY: [0, burst.translateY ?? 0, 0],
          scale: [1, burst.scale ?? 1, 1],
          rotate: [0, burst.rotate ?? 0, 0],
          duration: burst.duration,
          ease: 'spring(1, 80, 10, 0)',
        });
      }

      const loop = EMOTION_LOOP[mood] ?? EMOTION_LOOP.idle;
      const instance = animate(el, {
        ...(loop as object),
        ease: 'inOutSine',
        loop: true,
        alternate: true,
      }) as unknown as { pause: () => void };
      loopRef.current = instance;
    });

    return () => {
      cancelled = true;
      loopRef.current?.pause();
    };
  }, [mood, elementRef]);
}
