'use client';
import { useRef } from 'react';
import Image from 'next/image';
import { resolveCharacterMoodImagePath, type CharacterMood } from '@squad/core';
import { useAnimeEmotion } from './useAnimeEmotion';

type Props = {
  characterId: string;
  mood: CharacterMood;
  size?: 'sm' | 'md' | 'lg';
};

const SIZES = { sm: 36, md: 52, lg: 72 };

export function CharacterAvatar({ characterId, mood, size = 'md' }: Props) {
  const avatarRef = useRef<HTMLDivElement>(null);
  useAnimeEmotion(mood, avatarRef as React.RefObject<HTMLElement | null>);

  const imgPath = resolveCharacterMoodImagePath(characterId, mood);
  const px = SIZES[size];

  return (
    <div ref={avatarRef} className="inline-block flex-shrink-0" style={{ width: px, height: px }}>
      <Image
        src={imgPath}
        alt={`${characterId} ${mood}`}
        width={px}
        height={px}
        className="rounded-full object-cover w-full h-full border-2 border-white/20"
        priority={size === 'lg'}
      />
    </div>
  );
}
