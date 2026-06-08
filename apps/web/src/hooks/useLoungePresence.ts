'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  CHARACTER_TEMPLATES,
  readCharacterMood,
  type CharacterMood,
  type IdleTier,
  type StageRuntimeState,
} from '@squad/core';
import { useSocket } from './useSocket';

type PresenceEntry = {
  state: StageRuntimeState;
  idleTier: IdleTier;
  mood: CharacterMood;
  activity: 'idle' | 'thinking' | 'typing';
};

type PresenceMap = Record<string, PresenceEntry>;

function buildInitialPresence(): PresenceMap {
  const initial: PresenceMap = {};
  for (const template of CHARACTER_TEMPLATES) {
    initial[template.characterId] = {
      state: 'idle',
      idleTier: 'ready',
      mood: readCharacterMood(template.characterId, { stageState: 'idle', idleTier: 'ready' }),
      activity: 'idle',
    };
  }
  return initial;
}

export function useLoungePresence() {
  const socket = useSocket();
  const [presence, setPresence] = useState<PresenceMap>(() => buildInitialPresence());

  useEffect(() => {
    for (const template of CHARACTER_TEMPLATES) {
      socket.emit('join_stage', { characterId: template.characterId });
    }

    const onStageState = (data: {
      characterId: string;
      state: StageRuntimeState;
      idleTier?: IdleTier;
      mood: CharacterMood;
    }) => {
      if (!data.characterId) return;
      setPresence((prev) => ({
        ...prev,
        [data.characterId]: {
          state: data.state,
          idleTier: data.idleTier ?? 'ready',
          mood: data.mood,
          activity: data.state === 'processing' ? 'thinking' : 'idle',
        },
      }));
    };

    const onMessageChunk = (data: { characterId: string }) => {
      if (!data.characterId) return;
      setPresence((prev) => {
        const current = prev[data.characterId];
        if (!current) return prev;
        return {
          ...prev,
          [data.characterId]: {
            ...current,
            state: 'processing',
            activity: 'typing',
          },
        };
      });
    };

    const onMessageDone = (data: { characterId: string }) => {
      if (!data.characterId) return;
      setPresence((prev) => {
        const current = prev[data.characterId];
        if (!current) return prev;
        return {
          ...prev,
          [data.characterId]: {
            ...current,
            activity: current.state === 'processing' ? 'thinking' : 'idle',
          },
        };
      });
    };

    socket.on('stage_state', onStageState);
    socket.on('message_chunk', onMessageChunk);
    socket.on('message_done', onMessageDone);
    socket.on('message_error', onMessageDone);
    return () => {
      socket.off('stage_state', onStageState);
      socket.off('message_chunk', onMessageChunk);
      socket.off('message_done', onMessageDone);
      socket.off('message_error', onMessageDone);
    };
  }, [socket]);

  const counts = useMemo(() => {
    const list = Object.values(presence);
    const active = list.filter((item) => item.state === 'processing').length;
    const typing = list.filter((item) => item.activity === 'typing').length;
    const thinking = list.filter((item) => item.activity === 'thinking').length;
    const sleeping = list.filter(
      (item) =>
        item.state === 'idle' && (item.idleTier === 'resting' || item.idleTier === 'offline'),
    ).length;
    const idle = list.filter((item) => item.state === 'idle' && item.idleTier === 'ready').length;
    return { active, typing, thinking, idle, sleeping };
  }, [presence]);

  return { presence, counts };
}
