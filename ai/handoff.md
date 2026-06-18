# Handoff — C-RUN-001

## Status

PASS

## Summary

Made the Projects page interactive — added task/run lifecycle buttons (Start Task, Complete/Fail/Cancel Run) that call existing backend API endpoints. Previously the page was read-only; now it's a functional workflow management tool.

## Changes Applied

- `apps/web/src/lib/api.ts`: Added `startTask()`, `completeRun()`, `failRun()`, `cancelRun()` mutation functions
- `apps/web/src/app/projects/ProjectLifecycleActions.tsx`: New client component with lifecycle buttons + loading states
- `apps/web/src/app/projects/page.tsx`: Integrated `ProjectLifecycleActions` into character cards
- `apps/web/src/lib/api.test.ts`: 6 new tests for lifecycle mutations (295 total)

## Verification Summary

- Web TypeScript: PASS
- Web tests: PASS, 295 tests (6 new lifecycle mutation tests)
- Root lint: PASS
- Browser QA: PASS
  - "▶ Start" button appears on todo tasks → click creates run via POST /tasks/:id/start
  - "✅" complete → PATCH /runs/:id/complete → button disappears (run succeeded)
  - "❌" fail / "⏹" cancel buttons present on pending/running runs
  - Loading states (···) shown during mutation
  - Zero JS errors

## Active Risks

None.

## Optional Future Work

- Socket event consumption for real-time updates (no manual refresh needed)
- Create new projects/tasks UI
- Task detail view with run history
