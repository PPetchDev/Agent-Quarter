# Contract C-RUN-001 — Define run/task lifecycle for Projects page

**Status:** ACTIVE
**Date:** 2026-06-30
**Goal:** Lead character spawns Member agents per todo item

## Context

The Projects page currently displays projects, tasks, and runs but lacks the full orchestration lifecycle where a Lead character spawns Member agents to work on todo items. This contract implements the design spec §2.3 vision of multi-agent task execution.

## Scope

- `apps/web/src/app/projects/page.tsx` — Projects page UI
- `apps/web/src/lib/api.ts` — API adapters for run/task lifecycle
- `apps/api/src/projects/*` — Backend project/task/run services
- `packages/core/src/project.ts` — Domain types (Project, Task, Run)

## Implementation Plan

1. **Backend Enhancement**
   - Extend RunsService to support Member agent spawning per task
   - Add socket events for agent spawn/completion notifications
   - Implement task → Member agent mapping logic

2. **Frontend Integration**
   - Add Member agent visualization to Projects page
   - Wire run lifecycle buttons to agent spawn/completion
   - Display active Member agents per task

3. **Agent Orchestration**
   - Lead character (Mai) initiates task assignment
   - Member agents spawn and work on assigned tasks
   - Completion triggers agent despawn and task status update

## Verification

- All existing tests pass (486 total)
- New tests for Member agent spawning logic
- Browser QA: Projects page shows Member agents on task start
- TypeScript clean, lint clean

## Risks

- Member agent spawning may conflict with existing lounge agent system
- Need to ensure Projects page doesn't overload with too many agents
