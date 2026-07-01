# Contract C-PROJECTS-FULL-001 — Projects page full implementation

**Status:** ACTIVE
**Date:** 2026-06-30
**Goal:** Full CRUD implementation for Projects page with create/edit/delete capabilities

## Context

The Projects page currently displays read-only projects from seed data. This contract adds full CRUD functionality for managing projects, tasks, and runs, enabling users to create new projects, add tasks, and track execution history.

## Scope

- `apps/web/src/app/projects/page.tsx` — Projects page UI with CRUD modals
- `apps/web/src/app/projects/CreateProjectModal.tsx` (new) — Create project modal
- `apps/web/src/app/projects/EditProjectModal.tsx` (new) — Edit project modal
- `apps/web/src/app/projects/CreateTaskModal.tsx` (new) — Create task modal
- `apps/web/src/lib/api.ts` — API adapters for CRUD operations
- `apps/api/src/projects/projects.controller.ts` — Backend CRUD endpoints
- `apps/api/src/projects/projects.service.ts` — Backend CRUD service
- `packages/core/src/project.ts` — Domain types (may need extension)

## Implementation Plan

1. **Backend CRUD Endpoints**
   - POST `/api/projects` — Create new project
   - PATCH `/api/projects/:id` — Update project
   - DELETE `/api/projects/:id` — Delete project
   - POST `/api/projects/:projectId/tasks` — Create task
   - PATCH `/api/tasks/:id` — Update task
   - DELETE `/api/tasks/:id` — Delete task

2. **Frontend UI Components**
   - Create project modal with character selection, title, summary, status
   - Edit project modal for updating project details
   - Create task modal with title, status, assignee
   - Add "Create Project" button to Projects page header
   - Add edit/delete actions to project cards

3. **Data Persistence**
   - Extend in-memory storage to support CRUD operations
   - Consider adding localStorage persistence for demo purposes
   - Maintain backward compatibility with seed data

4. **Validation & UX**
   - Form validation for required fields
   - Confirmation dialogs for delete actions
   - Error handling and user feedback
   - Optimistic UI updates where appropriate

## Verification

- All existing tests pass (319 total)
- New tests for CRUD endpoints
- New tests for modal components
- Browser QA: Create/edit/delete projects and tasks successfully
- TypeScript clean, lint clean

## Risks

- In-memory storage loses data on server restart
- Need to ensure seed data doesn't conflict with user-created projects
- Modal states may need careful management
