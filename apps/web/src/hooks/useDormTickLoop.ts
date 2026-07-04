import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { tickDorm, type DormState } from '@/game/dorm/dormEngine';
import type { AgentState } from '@/game/agents/agentTypes';

const DEFAULT_INTERVAL_MS = 10_000;

export type DormTickWalkerMap = Record<string, { agent: { state: AgentState } }>;

export interface UseDormTickLoopParams {
  roomReady: boolean;
  agentIds: string[];
  officeWalkersRef: MutableRefObject<DormTickWalkerMap>;
  comfortRef: MutableRefObject<number>;
  setDorm: Dispatch<SetStateAction<DormState>>;
  intervalMs?: number;
}

/**
 * Drives passive dorm food-drain / XP / morale / affection while the room is
 * ready. Reads officeWalkersRef and comfortRef fresh on every tick so it
 * never needs to re-subscribe when those values change between ticks.
 */
export function useDormTickLoop({
  roomReady,
  agentIds,
  officeWalkersRef,
  comfortRef,
  setDorm,
  intervalMs = DEFAULT_INTERVAL_MS,
}: UseDormTickLoopParams): void {
  useEffect(() => {
    if (!roomReady) return;
    const id = setInterval(() => {
      const restingIds = agentIds.filter(
        (agentId) => officeWalkersRef.current[agentId]?.agent.state === 'resting',
      );
      setDorm(
        (prev) => tickDorm(prev, Date.now(), { comfort: comfortRef.current, restingIds }).state,
      );
    }, intervalMs);
    return () => clearInterval(id);
  }, [roomReady, agentIds, officeWalkersRef, comfortRef, setDorm, intervalMs]);
}
