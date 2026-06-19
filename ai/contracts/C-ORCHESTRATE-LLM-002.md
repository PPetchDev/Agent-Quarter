# C-ORCHESTRATE-LLM-002 — LLM-Powered Workflow Planner

## Type
IMPLEMENT

## Mode
Full Contract

## Status
PASS (2026-06-19)

## Goal
Replace the rule-based `scoreAgentForCommand()` with LLM-powered planning via the existing `DialogueService` infrastructure. When LLM is available, the planner delegates to Claude for intelligent step generation. Falls back to rule-based `planWorkflowSteps()` when LLM is unavailable.

## Architecture
```
planWorkflowStepsLLM(command, context)
  │
  ├─[LLM available?]──▶ POST /api/dialogue/plan-workflow
  │                     │
  │                     ├─ Claude generates JSON step array
  │                     └─ Parse + validate → OfficeWorkflowStep[]
  │
  └─[LLM unavailable]─▶ planWorkflowSteps(command, context)  (rule-based fallback)
```

## Implementation Summary

### Backend (apps/api)
- `dialogue.service.ts`: Added `planOfficeWorkflow()` with `buildWorkflowPlanPrompt()`, `parseWorkflowPlanText()`, and `planWorkflowFallback()`. LLM path tries provider first, falls back to deterministic planner on error/empty result.
- `dialogue.controller.ts`: Added `POST /api/dialogue/plan-workflow` endpoint accepting `PlanWorkflowInput` (commandText, busyAgentIds, previousError).
- `dialogue.service.test.ts`: 26 tests covering LLM success, LLM fallback, deterministic only, busy agent handling, error retry.
- `dialogue.controller.test.ts`: 11 tests covering endpoint routing, validation, response shapes.

### Frontend (apps/web)
- `officeWorkflow.ts`: Added `planWorkflowStepsLLM()` (REST client calling `/api/dialogue/plan-workflow`), `convertLLMSteps()` (maps LLM taskType → AgentTaskType enum), `llmPlannerAvailable` flag.
- `dialogueAdapter.ts`: Added `PlanWorkflowLLMResponse`, `WorkflowStepLLM` types. Extended adapter with `planWorkflow()` method.
- `LoungeCanvas.tsx`: Integrated LLM planner into workflow start — calls `planWorkflowStepsLLM()` first, falls back to rule-based.

## Gate Results

| Gate | Result |
|------|--------|
| API dialogue tests (37) | PASS |
| Web workflow tests (29) | PASS |
| Full web tests (305) | PASS |
| pnpm typecheck | EXIT:0 |
| pnpm lint | EXIT:0 |
| pnpm build | EXIT:0 |

## Files Changed

- `apps/api/src/dialogue/dialogue.service.ts` — +planOfficeWorkflow + helpers
- `apps/api/src/dialogue/dialogue.service.test.ts` — +LLM plan tests
- `apps/api/src/dialogue/dialogue.controller.ts` — +POST /plan-workflow
- `apps/api/src/dialogue/dialogue.controller.test.ts` — +endpoint tests
- `apps/web/src/game/agents/officeWorkflow.ts` — +planWorkflowStepsLLM + convertLLMSteps
- `apps/web/src/game/agents/officeWorkflow.test.ts` — +LLM integration tests
- `apps/web/src/game/dialogue/dialogueAdapter.ts` — +PlanWorkflowLLMResponse types
- `apps/web/src/components/lounge/LoungeCanvas.tsx` — LLM planner integration

## Active Risks

None.
