# C-RUN-001 — Interactive Run/Task Lifecycle on Projects Page

## Type
IMPLEMENT

## Mode
Full Contract

## Goal
Make the Projects page interactive — add lifecycle buttons (Start Task, Complete Run, Fail Run, Cancel Run) so the existing domain model + API endpoints become a functional workflow management tool. Currently the page is read-only; all backend endpoints exist but have no UI triggers.

## Investigation Findings

### Already exists:
- **`packages/core/src/project.ts`**: Full domain model — Project, Task, Run types + seed data + pure helpers (`canStartTask`, `canStartRun`, `completeRun`, `failRun`, `cancelRun`)
- **`apps/api/src/projects/tasks.controller.ts`**: `POST /tasks/:id/start` — starts a task, creates a run, emits socket event
- **`apps/api/src/projects/runs.controller.ts`**: `PATCH /runs/:id/complete`, `/fail`, `/cancel` — mutates run status, emits socket events
- **`apps/api/src/projects/runs.gateway.ts`**: Socket.io events for `run.started`, `run.completed`, `run.failed`, `run.cancelled`
- **`apps/web/src/app/projects/page.tsx`**: Full read-only UI — displays 7 character cards with project/task/run info
- **`apps/web/src/lib/api.ts`**: `fetchProjects`, `fetchProjectTasks`, `fetchTaskRuns`

### Missing:
- **Interactive buttons**: No "Start Task" / "Complete Run" / "Fail Run" / "Cancel Run" buttons in the UI
- **Optimistic updates**: No client-side state mutation when clicking buttons
- **Socket event consumption**: Runs gateway emits events but Projects page doesn't listen

## Scope (Single Slice)

### Slice A — Interactive Lifecycle Buttons

**Frontend-only. Zero backend changes.**

1. **Add API mutation functions** to `apps/web/src/lib/api.ts`:
   - `startTask(taskId)` → POST /tasks/:id/start
   - `completeRun(runId)` → PATCH /runs/:id/complete
   - `failRun(runId)` → PATCH /runs/:id/fail
   - `cancelRun(runId)` → PATCH /runs/:id/cancel

2. **Add interactive buttons** to the Projects page card (per character):
   - **Start Task button**: shown when project has a `todo` task, hidden otherwise. Calls `startTask()`, then refreshes tasks/runs.
   - **Run lifecycle buttons**: shown inline with latest run. Complete (✅ green), Fail (❌ red), Cancel (⏹️ grey). Calls respective mutation, refreshes.
   - **Loading state**: button disabled + spinner while mutation in-flight.

3. **Refresh pattern**: After any mutation, re-fetch tasks + runs for that project only (not full page reload). Use React state + `useRouter().refresh()` for simplicity.

## Files In Scope
- `apps/web/src/lib/api.ts` — add mutation functions
- `apps/web/src/app/projects/page.tsx` — add buttons + mutation handlers (convert to client component sections)
- `ai/active.contract.md`, `ai/context-packet.md`, `ai/handoff.md`, `ai/changelog.md`

## Out Of Scope
- Backend/API changes (endpoints already exist)
- `packages/core` changes
- New database models or Prisma changes
- Socket event consumption (defer to future contract)
- Creating new projects/tasks (only lifecycle of existing seed data)
- Mobile optimization

## Acceptance Criteria
- [ ] "Start Task" button appears on todo tasks, hidden otherwise
- [ ] Clicking "Start Task" → POST /tasks/:id/start → sees new run appear
- [ ] Run shows Complete (✅) / Fail (❌) / Cancel (⏹️) buttons
- [ ] Clicking Complete → PATCH /runs/:id/complete → run status updates
- [ ] Buttons disabled during loading
- [ ] All existing tests pass + new api.ts tests
- [ ] TypeScript clean
- [ ] Browser QA: start task → complete run → verify state changes

## Verification Commands
```bash
pnpm --filter @squad/web test -- --run; echo "EXIT:$?"
pnpm exec tsc -p apps/web/tsconfig.json --noEmit; echo "EXIT:$?"
pnpm lint; echo "EXIT:$?"
```

## Stop Conditions
- Stop if any API endpoint returns unexpected errors
- Stop if tests regress
- Stop if backend needs changes (API contract assumed stable)
