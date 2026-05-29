'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './useSocket';
import { readCharacterMood, type CharacterMood, type StageRuntimeState, type IdleTier } from '@squad/core';

type StageState = {
  state: StageRuntimeState;
  idleTier: IdleTier;
  mood: CharacterMood;
};

type MessageChunk = { messageId: string; chunk: string };
type CompletedMessage = { messageId: string; fullContent: string; mood?: CharacterMood };

export function useStageSocket(characterId: string) {
  const socket = useSocket();
  const [stageState, setStageState] = useState<StageState>({
    state: 'idle', idleTier: 'ready', mood: 'idle',
  });
  const [chunks, setChunks] = useState<MessageChunk[]>([]);
  const [completedMessage, setCompletedMessage] = useState<CompletedMessage | null>(null);
  const [moodOverride, setMoodOverride] = useState<CharacterMood | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    socket.emit('join_stage', { characterId });

    const onStageState = (data: { characterId: string; state: StageRuntimeState; idleTier?: IdleTier; mood: CharacterMood }) => {
      if (data.characterId !== characterId) return;
      setStageState({ state: data.state, idleTier: data.idleTier ?? 'ready', mood: data.mood });
    };
    const onChunk = (data: { characterId: string } & MessageChunk) => {
      if (data.characterId !== characterId) return;
      setChunks(prev => [...prev, { messageId: data.messageId, chunk: data.chunk }]);
    };
    const onMoodOverride = (data: { characterId: string; mood: CharacterMood }) => {
      if (data.characterId !== characterId) return;
      setMoodOverride(data.mood);
      setTimeout(() => setMoodOverride(null), 3_000);
    };
    const onDone = (data: { characterId: string; messageId: string; fullContent: string; mood?: CharacterMood }) => {
      if (data.characterId !== characterId) return;
      setChunks([]);
      setCompletedMessage({ messageId: data.messageId, fullContent: data.fullContent, mood: data.mood });
      setLastError(null);
    };
    const onError = (data: { characterId: string; error: string }) => {
      if (data.characterId !== characterId) return;
      setChunks([]);
      setLastError(data.error);
    };

    socket.on('stage_state',   onStageState);
    socket.on('message_chunk', onChunk);
    socket.on('mood_override', onMoodOverride);
    socket.on('message_done',  onDone);
    socket.on('message_error', onError);

    return () => {
      socket.off('stage_state',   onStageState);
      socket.off('message_chunk', onChunk);
      socket.off('mood_override', onMoodOverride);
      socket.off('message_done',  onDone);
      socket.off('message_error', onError);
    };
  }, [socket, characterId]);

  const sendMessage = useCallback((content: string) => {
    setLastError(null);
    setCompletedMessage(null);
    socket.emit('send_message', { characterId, content });
  }, [socket, characterId]);

  const activeMood = moodOverride ?? stageState.mood;
  return { stageState, activeMood, chunks, completedMessage, sendMessage, lastError };
}
