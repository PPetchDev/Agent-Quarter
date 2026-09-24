import { useEffect, useRef, useState } from 'react';
import { pickAgentDialogue, type AgentSnapshot } from '@/game/dialogue/dialogueScheduler';
import { generateOfficeDialogue } from '@/game/dialogue/dialogueAdapter';
import type { OfficeAgentId, OfficeChatMessage, OfficeWorkflowStatus } from '@/game/agents/officeWorkflow';

const LLM_REQUEST_COOLDOWN_MS = 90_000;

export interface UseDialogueSchedulerParams {
  officeStatus: OfficeWorkflowStatus;
  roomReady: boolean;
  agents: AgentSnapshot[];
  appendOfficeChat: (message: Omit<OfficeChatMessage, 'id'>) => void;
  enableLlmDialogue: boolean;
  random?: () => number;
}

export interface UseDialogueSchedulerResult {
  activeDialogueBubble: { agentId: OfficeAgentId; text: string } | null;
}

/**
 * Owns the autonomous-agent dialogue tick: picks a line via pickAgentDialogue
 * every 4s while idle, tries the LLM adapter (gated by an in-flight guard and
 * a 90s per-request cooldown), and falls back to the deterministic line on
 * empty/failed/stale LLM responses. A stale response (officeStatus moved off
 * 'idle', or the hook unmounted, before the LLM promise settles) is dropped
 * with no fallback at all — matches the original inline effect exactly.
 */
export function useDialogueScheduler({
  officeStatus,
  roomReady,
  agents,
  appendOfficeChat,
  enableLlmDialogue,
  random,
}: UseDialogueSchedulerParams): UseDialogueSchedulerResult {
  const lastDialogueAtRef = useRef<number | null>(null);
  const recentDialogueTextsRef = useRef<string[]>([]);
  const [activeDialogueBubble, setActiveDialogueBubble] = useState<{
    agentId: OfficeAgentId;
    text: string;
  } | null>(null);
  const dialogueBubbleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const llmInFlightRef = useRef(false);
  const llmLastRequestAtRef = useRef<number | null>(null);
  const dialogueMountedRef = useRef(true);
  const officeStatusRef = useRef(officeStatus);
  const llmRequestIdRef = useRef(0);
  // agents is rebuilt as a fresh array literal on every LoungeCanvas render;
  // reading it via ref (instead of listing it as an effect dependency) keeps
  // the tick interval's lifecycle stable across those renders, matching the
  // original inline effect's five-stable-primitive-deps behavior.
  const agentsRef = useRef(agents);
  const randomRef = useRef(random);

  useEffect(() => {
    officeStatusRef.current = officeStatus;
  }, [officeStatus]);

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  useEffect(() => {
    randomRef.current = random;
  }, [random]);

  useEffect(() => {
    if (officeStatus !== 'idle') return;
    if (!roomReady) return;

    const tick = () => {
      const message = pickAgentDialogue({
        now: Date.now(),
        lastDialogueAt: lastDialogueAtRef.current,
        cooldownMs: 15_000,
        probability: 0.1,
        agents: agentsRef.current,
        recentTexts: recentDialogueTextsRef.current,
        random: randomRef.current,
      });

      if (message) {
        const now = message.createdAt;
        lastDialogueAtRef.current = now;

        const appendDialogue = (
          fromAgentId: OfficeAgentId,
          toAgentId: OfficeAgentId | undefined,
          text: string,
        ) => {
          recentDialogueTextsRef.current = [...recentDialogueTextsRef.current.slice(-4), text];
          appendOfficeChat({
            agentId: fromAgentId,
            toAgentId,
            kind: 'dialogue',
            text,
          });

          const bubble = { agentId: fromAgentId, text };
          setActiveDialogueBubble(bubble);
          if (dialogueBubbleTimeoutRef.current) {
            clearTimeout(dialogueBubbleTimeoutRef.current);
          }
          dialogueBubbleTimeoutRef.current = setTimeout(() => {
            setActiveDialogueBubble(null);
            dialogueBubbleTimeoutRef.current = null;
          }, 5_000);
        };

        if (
          enableLlmDialogue &&
          !llmInFlightRef.current &&
          (llmLastRequestAtRef.current === null ||
            now - llmLastRequestAtRef.current >= LLM_REQUEST_COOLDOWN_MS)
        ) {
          llmInFlightRef.current = true;
          llmLastRequestAtRef.current = now;
          const requestId = ++llmRequestIdRef.current;

          generateOfficeDialogue({
            fromAgentId: message.fromAgentId,
            toAgentId: message.toAgentId,
            officeStatus: 'idle',
            recentDialogue: recentDialogueTextsRef.current,
            now,
            maxChars: 80,
          })
            .then((response) => {
              llmInFlightRef.current = false;

              if (
                requestId !== llmRequestIdRef.current ||
                !dialogueMountedRef.current ||
                officeStatusRef.current !== 'idle'
              ) {
                return;
              }

              if (!response || !response.text?.trim()) {
                appendDialogue(message.fromAgentId, message.toAgentId, message.text);
                return;
              }

              appendDialogue(response.fromAgentId, response.toAgentId, response.text);
            })
            .catch(() => {
              llmInFlightRef.current = false;
              if (
                requestId === llmRequestIdRef.current &&
                dialogueMountedRef.current &&
                officeStatusRef.current === 'idle'
              ) {
                appendDialogue(message.fromAgentId, message.toAgentId, message.text);
              }
            });
        } else {
          appendDialogue(message.fromAgentId, message.toAgentId, message.text);
        }
      }
    };

    const interval = setInterval(tick, 4_000);
    return () => clearInterval(interval);
  }, [officeStatus, roomReady, appendOfficeChat, enableLlmDialogue]);

  useEffect(() => {
    return () => {
      dialogueMountedRef.current = false;
      if (dialogueBubbleTimeoutRef.current) {
        clearTimeout(dialogueBubbleTimeoutRef.current);
      }
    };
  }, []);

  return { activeDialogueBubble };
}
