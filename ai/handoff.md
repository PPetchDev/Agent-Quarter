# Handoff — C-ORCHESTRATE-LLM-002 → C-OFFICE-MOVEMENT-001

## Status

PASS

## Summary

Phase 2 LLM-powered workflow planner complete. Backend `POST /api/dialogue/plan-workflow` delegates to Claude via DialogueService LLM provider with deterministic fallback. Frontend `planWorkflowStepsLLM()` calls the endpoint and converts LLM task types to AgentTaskType enum. LoungeCanvas integrated — workflow start uses LLM planner first, falls back to rule-based.

## Changes Applied

- `apps/api/src/dialogue/dialogue.service.ts` — +planOfficeWorkflow, +buildWorkflowPlanPrompt, +parseWorkflowPlanText, +planWorkflowFallback
- `apps/api/src/dialogue/dialogue.service.test.ts` — +LLM plan tests (26 total)
- `apps/api/src/dialogue/dialogue.controller.ts` — +POST /plan-workflow
- `apps/api/src/dialogue/dialogue.controller.test.ts` — +endpoint tests (11 total)
- `apps/web/src/game/agents/officeWorkflow.ts` — +planWorkflowStepsLLM, +convertLLMSteps
- `apps/web/src/game/agents/officeWorkflow.test.ts` — +LLM integration tests
- `apps/web/src/game/dialogue/dialogueAdapter.ts` — +PlanWorkflowLLMResponse types
- `apps/web/src/components/lounge/LoungeCanvas.tsx` — LLM planner integration

## Verification Summary

- API dialogue tests (37): PASS
- Web workflow tests (29): PASS
- Full web tests (305): PASS
- pnpm typecheck: EXIT:0
- pnpm lint: EXIT:0
- pnpm build: EXIT:0

## Active Risks

None.

## Next Contract

C-OFFICE-MOVEMENT-001 — Agent Movement System (GridMap + A* + MovementSystem). See `ai/contracts/C-OFFICE-MOVEMENT-001.md`.
