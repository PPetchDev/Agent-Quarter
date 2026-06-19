# Context Packet — P-ORCHESTRATE-LLM-002

_Compiled for: Claude Code | Date: 2026-06-19 | Status: CLOSED (PASS)_

## Packet ID

`P-ORCHESTRATE-LLM-002`

## Contract

`C-ORCHESTRATE-LLM-002`

## User Problem

Phase 2 of the dynamic workflow planner — replace rule-based agent scoring with LLM-powered planning via DialogueService. Frontend calls `POST /api/dialogue/plan-workflow`, Claude generates intelligent step sequences, falls back to deterministic planner when LLM unavailable.

## Required Reads (already verified)

- `apps/api/src/dialogue/dialogue.service.ts` — planOfficeWorkflow() + buildWorkflowPlanPrompt() + parseWorkflowPlanText() + planWorkflowFallback()
- `apps/api/src/dialogue/dialogue.controller.ts` — POST /dialogue/plan-workflow endpoint
- `apps/web/src/game/agents/officeWorkflow.ts` — planWorkflowStepsLLM() + convertLLMSteps()
- `apps/web/src/game/dialogue/dialogueAdapter.ts` — PlanWorkflowLLMResponse, WorkflowStepLLM types
- `apps/web/src/components/lounge/LoungeCanvas.tsx` — LLM planner integration in workflow start

## Implementation Intent

Phase 2: Backend LLM planner via DialogueService + frontend adapter + LoungeCanvas integration. LLM → fallback chain for resilience.

## Gate Results

| Gate | Result |
|------|--------|
| API dialogue tests (37) | PASS |
| Web workflow tests (29) | PASS |
| Full web tests (305) | PASS |
| pnpm typecheck | EXIT:0 |
| pnpm lint | EXIT:0 |
| pnpm build | EXIT:0 |
