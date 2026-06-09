# Symbol Index

_Updated: C-OFFICE-RUN-EXECUTION-FRONTEND-HYDRATION-FIX-006F_

## Core Domain

| Symbol | Kind | Description |
|---|---|---|
| `CHARACTER_TEMPLATES` | constant | Shared character roster, role metadata, avatars, traits, and system prompts in `packages/core/src/character.ts` |
| `CHARACTER_MOOD_REGISTRY` | constant | Per-character mood availability, default mood, and image filename mapping in `packages/core/src/character.ts` |
| `readCharacterMood` | function | Maps stage runtime state and idle tier to a character-safe mood in `packages/core/src/character.ts` |
| `resolveCharacterMoodImagePath` | function | Resolves a registered character mood image path with default-avatar fallback |
| `parseEmotionOverride` | function | Extracts the last valid `[emotion:x]` override from Claude text in `packages/core/src/emotion-parser.ts` |
| `stripEmotionTags` | function | Removes `[emotion:x]` tags from text before user display |
| `StageTracker` | class | Tracks `processing` / `idle` stage state and returns to idle after the streaming idle deadline in `packages/core/src/stage-tracker.ts` |
| `Project` / `Task` / `Run` | types | Minimal orchestration domain primitives in `packages/core/src/project.ts` |
| `getNextTaskForProject` | function | Selects the next actionable task, preferring `in_progress` over `todo` |
| `canStartTask` / `canStartRun` | functions | Pure lifecycle guards for task and run starts |
| `buildRunStartPatch` | function | Builds an immutable running `Run` value |
| `completeRun` / `failRun` / `cancelRun` | functions | Immutable terminal run transitions preserving all other run fields |

## Lounge Room Layout

| Symbol | Kind | Description |
|---|---|---|
| `ROOM_TILES_X` / `ROOM_TILES_Y` | constants | Canonical lounge footprint dimensions in `pixiRoom.ts` |
| `computeRoomProjection` | function | Calculates canvas scale/origin from room width/depth |
| `setRoomProjection` | function | Applies live projection globals for PixiJS rendering |
| `proj` | function | Projects lounge world coordinates to screen coordinates |
| `drawBackground` | function | Draws floor, walls, rug, room edges, and theme tints |
| `DEFAULT_OBJECTS` | constant | Fallback non-overlapping furniture layout |
| `FURNITURE_DIMS` | constant | Furniture visual/highlight dimensions; floor objects should match occupied grid footprint |
| `FURNITURE_TILES` | constant | Tile footprints used for collision and hit polygons |
| `drawComputerDesk` | function | Draws the coding workstation with monitor, keyboard, desk notes, and mug |
| `drawPrinter` | function | Draws the compact print/utility station |
| `drawDocumentBoard` | function | Draws the wall planning/document board |
| `drawActiveStationHighlight` | function | Draws a gold floor ring + dispatches ambient body glow at a parameterised alpha used to pulse the active work station |
| `drawStationAmbient` | function | Interpreter that walks the `STATION_AMBIENTS` table for the given furniture type and draws each shape with coordinates scaled by `FURNITURE_DIMS` |
| `STATION_AMBIENTS` | constant | Per-station ambient shape table (`face`/`halo`/`point`/`topOutline`) with proportional w/h offsets — lives in `stationAmbients.ts` (PIXI-free, unit-tested) |
| `AmbientShape` | type | Union of ambient shape kinds for `STATION_AMBIENTS` entries — defined in `stationAmbients.ts` |
| `RoomScene.setActiveStation` | method | Draws or clears the pulsing active-station highlight on its own graphics layer |
| `activeStationGraphics` | PIXI layer | Scene layer hosting the active-station pulse, drawn below `highlightGraphics` |
| `OFFICE_AGENT_SPINE_ASSET_BY_ID` | constant | Deterministic mapping from the five visible office workflow agents to prepared Spine assets in `apps/web/public/azur-char/*` |
| `OFFICE_AGENT_SPINE_ASSETS` | constant | Ordered asset list used by `LoungeCanvas` to load all visible in-room Spine agents |
| `createInitialSpineLoadStatus` | function | Initializes every mapped office agent as `loading` until Pixi confirms Spine load success/failure |
| `shouldShowHtmlAgentAvatar` | function | Keeps the HTML avatar hidden for mapped Spine agents unless the Spine asset fails, preventing overlay avatars from covering Spine bodies |
| `getAgentOverlayLayout` | function | Moves speech/status bubbles beside Spine bodies while preserving avatar fallback layout |
| `resolveAgentBubbleAnchor` | function | Resolves speech/status bubble position from the same agent anchor used by the Spine body |
| `normalizeSpineFootAnchor` | function | Private `LoungeCanvas` helper that normalizes loaded Spine local bounds to a bottom-center foot anchor before movement updates |
| `FURNITURE_CATALOG` | constant | Furniture shop metadata, including role-aligned station types |
| `loungeStations` | constant | Canonical station registry for agent tasks |
| `resolveAgentTask` | function | Maps task types to lounge station ids and target iso points |
| `buildLoungeBlockedCells` | function | Converts floor furniture footprints into blocked lounge grid cells |
| `planLoungeGridRoute` | function | Plans a lounge route around static furniture to a station target |
| `planIsoGridPath` | function | Pure grid route planner for bounded room cells |
| `findGridPath` | function | Breadth-first path search over unblocked cells |
| `AgentRouteDebug` | type | Route overlay data exposed by `useAgentWalk` |
| `useAgentWalk` | hook | Plans route waypoints, animates segment by segment, exposes route debug data, refreshes routes after committed layout changes, and ticks the post-arrival work timer to auto-return the agent to idle |
| `TASK_CONFIG` | constant | Consolidated task config: stationId, arriveState, walkingBubble, bubble, doneBubble, workDurationMs per task type in `taskResolver.ts` (replaces 6 separate Record maps) |
| `useCountdown` | hook | Reusable countdown timer hook returning formatted HH:MM:SS in `hooks/useCountdown.ts` |
| `projAt` | function | Pure isometric projection with explicit S/OX/OY params in `pixiRoom.ts` (used by `useAgentWalk` to avoid duplicating projection math) |
| `Agent.workDurationMs` | field | Total milliseconds for the current work session |
| `Agent.workElapsedMs` | field | Milliseconds elapsed in the current work session |
| `Agent.taskQueue` | field | Pending task types the agent will auto-run after the current work completes |
| `enqueueTask` | function | Pure helper that appends a task to the queue (immutable) in `taskQueue.ts` |
| `dequeueTask` | function | Pure helper that pops the queue head and returns `{ next, rest }` |
| `useAgentWalk.enqueueTask` | hook API | Append a task to the agent's queue without interrupting the current task |
| `useAgentWalk.clearQueue` | hook API | Empty the agent's task queue without affecting the active task |
| `MAX_TASK_QUEUE_LENGTH` | constant | Default hard cap on the agent's pending task queue (8); `enqueueTask` and `useAgentWalk` accept `maxLength` / `maxQueueLength` overrides |
| `OFFICE_WORKFLOW_AGENTS` | constant | Five visible office workflow agents (`Mai`, `Aki`, `Ren`, `Yui`, `Mika`) used by the lounge command board |
| `OFFICE_TOOL_BOUNDARIES` | constant | Tool boundary labels and guardrails for map, patch, verify, browser, and closeout lanes |
| `createOfficeWorkflowSteps` | function | Builds the deterministic five-step Map -> Build -> Contract -> Review -> Close handoff plan for a user command |
| `inferPrimaryOfficeTask` | function | Maps command text to the primary `AgentTaskType` used by the build step |
| `describeOfficeStepStart` / `describeOfficeStepDone` | functions | Format deterministic agent-to-agent chat messages for workflow handoffs |
| `AmbientDrawContext` | type | PIXI-free draw context (`proj`, `fillQuad`, `strokeQuad`, `circle`, `ellipse`, `dim`) supplied to `applyStationAmbient` and to `custom`-kind shape draw fns |
| `applyStationAmbient` | function | Pure interpreter — walks `STATION_AMBIENTS[type]` and dispatches each shape through a draw context |
| `getStationDim` | function | Returns `FURNITURE_DIMS[type]` with a `{w:1,d:1,h:1}` fallback for unknown types |
| `ResolvedAgentTask.doneBubbleText` | field | Per-task completion bubble shown when the work timer auto-completes |

## Routes

| Symbol | Kind | Description |
|---|---|---|
| `LoungePage` | Next.js page | Renders canonical lounge route |
| `OfficePage` | Next.js page | Redirects `/office` to `/lounge` |

## Stage / Projects

|| Symbol | Kind | Description ||
|---|---|---|
|| `ProjectsPage` | Next.js page | Renders project/task/run cards and places the dev-only read-only execution trigger beside an existing latest run when the local Codex UI env gate is enabled ||
|| `RunExecutionButton` | client component | Dev-only Projects page button in `apps/web/src/app/projects/RunExecutionButton.tsx`; hidden unless non-production and `NEXT_PUBLIC_ENABLE_LOCAL_CODEX_UI=true`, calls `executeRunDev` with a fixed read-only prompt, disables while pending, and shows local accepted/error status only ||
|| `READ_ONLY_EXECUTION_PROMPT` | constant | Fixed non-editable prompt used by `RunExecutionButton`; read-only UI smoke only, no user prompt textarea ||
|| `shouldShowRunExecutionButton` | function | Pure visibility guard for real run ids plus local Codex UI env gate. Uses direct `process.env` references for Next.js inlining; accepts optional `env` object for testing. ||
|| `isLocalCodexUiEnabled` | function | Env gate helper: returns true when `NODE_ENV !== 'production' && NEXT_PUBLIC_ENABLE_LOCAL_CODEX_UI === 'true'`. Uses direct `process.env` references for Next.js inlining; accepts optional `env` object for testing. ||
|| `createRunExecutionClickHandler` | function | Testable click handler helper that prevents duplicate pending execution and maps adapter success/errors to local button status ||

## Frontend Hooks

| Symbol | Kind | Description |
|---|---|---|
| `useRunSocket` | hook | Connects to socket.io namespace `/runs`; emits `run.started`, `run.completed`, `run.failed`, `run.cancelled` via callbacks |
| `useRunExecutionSocket` | hook | New hook in `apps/web/src/hooks/useRunExecutionSocket.ts`; connects to `/runs` namespace, consumes `run.execution.{started,log,tool,completed,failed}` events, scoped by runId, env-gated via `isExecutionUiEnabled`, resets on runId change. Accepts `UseRunExecutionSocketOptions` with `enabled` boolean to control connection. Socket effect depends on `[runId, enabled]` (006M: enabled added so socket connects after mount). |
| `UseRunExecutionSocketOptions` | type | Hook options: `{ enabled?: boolean }` — when `false`, hook returns state but never connects socket. |
| `executionReducer` | function | Pure reducer for execution events — supports STARTED/LOG/TOOL/COMPLETED/FAILED/RESET actions, caps at 20 events, delegates to `sanitizeMessage` |
| `sanitizeMessage` | function | Pure safety filter: strips stack traces (before whitespace collapse), collapses whitespace, truncates to 240 chars, masks mixed-case+digit base64, API key prefixes, PEM markers |
| `isExecutionUiEnabled` | function | Env gate: `NODE_ENV !== 'production' && NEXT_PUBLIC_ENABLE_LOCAL_CODEX_UI === 'true'` |
| `ExecutionEvent` | type | Union event shape: type, runId, timestamp + optional provider/mode/level/message/toolName/status/summary/errorSummary |
| `ExecutionEventType` | type | `'started' | 'log' | 'tool' | 'completed' | 'failed'` |
| `ExecutionState` | type | Reducer state: `{ events: ExecutionEvent[]; terminalStatus: ExecutionTerminalStatus }` |
| `ExecutionTerminalStatus` | type | `'idle' | 'completed' | 'failed'` |
| `RunExecutionEventsPanel` | client component | Dev-only panel in `apps/web/src/app/projects/RunExecutionEventsPanel.tsx`; renders execution events as plain colored text, shows terminal status badge, hidden when env gate closed or no events. Calls `useRunExecutionSocket` unconditionally; uses `enabled` option to control socket connection. |
| `formatEventLabel` | function | Pure display helper — formats each event type into a concise safe string (e.g. `"Execution started · provider: codex · mode: read-only"`) |
| `RunEventPayload` | type | `{ run: Run }` payload shape for run events |
| `UseRunSocketHandlers` | type | Callback handlers for run events |
| `LoungeCanvas` | component | Consumes `useRunSocket` for `onRunFailed`/`onRunCancelled` only; appends to officeChat with kind "blocked" |
| `pickAgentDialogue` | function | Pure deterministic dialogue scheduler — selects speaker/target, respects cooldown/probability/dedup, returns AgentDialogueMessage or null |
| `AgentDialogueMessage` | type | Dialogue message shape: fromAgentId, toAgentId?, text, createdAt, source: 'deterministic' |
| `PickAgentDialogueInput` | type | Input shape for pickAgentDialogue: now, lastDialogueAt, cooldownMs, probability, agents, recentTexts?, random? |
| `AgentSnapshot` | type | Minimal agent view for the scheduler: id (OfficeAgentId) + optional state string |

## Frontend API Adapters

| Symbol | Kind | Description |
|---|---|---|
| `executeRunDev` | function | Frontend dev execution adapter in `apps/web/src/lib/api.ts`; POSTs to `/api/runs/:id/execute` with `{ prompt, mode: 'read-only' }`, validates empty prompt before request, never sends `cwd` or workspace-write options, and returns a structured success/error result |
| `ExecuteRunDevResponse` | type | Successful dev execution trigger response: `{ runId: string; executionStarted: true }` |
| `ExecuteRunDevResult` | type | Structured adapter result union: `{ ok: true; data }` or `{ ok: false; status?; message }` |


| Symbol | Kind | Description |
|---|---|---|
| `ClaudeGateway` | class | Socket.io gateway, room-scoped emit |
| `ProjectsController` | class | GET `/projects`, `/projects/:id`, `/projects/:id/tasks` |
| `TasksController` | class | GET `/tasks/:id/runs`; POST `/tasks/:id/start` returns `Run` via `RunsService.createRun` |
| `RunsController` | class | PATCH `/runs/:id/{complete,fail,cancel}` + POST `/runs/:id/execute` (dev-only) via `RunsService` + `RunsGateway` + `RunExecutionService` |
| `RunsController.executeRun` | method | POST /api/runs/:id/execute — dev-only fire-and-forget execution trigger; env-gated (NODE_ENV, ENABLE_LOCAL_CODEX, ALLOW_LOCAL_PROCESS_EXECUTION); 202 Accepted; cwd server-side only |
| `RunsService` | class | Projects-module in-memory `Run` state owner (seed clone + create/read/complete/fail/cancel) |
| `RunsGateway` | class | Socket.io gateway on namespace `/runs`; server-push `run.{started,completed,failed,cancelled}` + `run.execution.{started,log,tool,completed,failed}` |
| `RunsGateway.emitRunExecutionStarted` | method | Emits `run.execution.started` with `RunExecutionStartedPayload` (provider, mode) |
| `RunsGateway.emitRunExecutionLog` | method | Emits `run.execution.log` with `RunExecutionLogPayload` (level, message) |
| `RunsGateway.emitRunExecutionTool` | method | Emits `run.execution.tool` with `RunExecutionToolPayload` (toolName, status, summary?) |
| `RunsGateway.emitRunExecutionCompleted` | method | Emits `run.execution.completed` with `RunExecutionCompletedPayload` (summary) |
| `RunsGateway.emitRunExecutionFailed` | method | Emits `run.execution.failed` with `RunExecutionFailedPayload` (errorSummary) |
| `RunExecutionEventBase` | type | Base payload: runId, taskId?, projectId?, agentId?, timestamp |
| `RunExecutionStartedPayload` | type | provider: 'codex'\|'mock'\|'manual', mode: 'read-only'\|'workspace-write' |
| `RunExecutionLogPayload` | type | level: 'debug'\|'info'\|'warn'\|'error', message |
| `RunExecutionToolPayload` | type | toolName, status: 'started'\|'completed'\|'failed', summary? |
| `RunExecutionCompletedPayload` | type | summary |
| `RunExecutionFailedPayload` | type | errorSummary |

### Execution

| Symbol | Kind | Description |
|---|---|---|
| `LocalCodexRunner` | class | Dev-only Codex CLI subprocess wrapper; spawns `codex exec --json` behind env gates, parses JSONL output |
| `LocalCodexRunner.run` | method | Accepts `LocalCodexRunnerInput`, returns `LocalCodexRunnerResult` — never throws for expected failures |
| `LocalCodexRunnerInput` | type | prompt, cwd, sandbox?, timeoutMs?, maxOutputBytes? |
| `LocalCodexRunnerResult` | type | ok, finalMessage?, events[], exitCode?, errorSummary?, timedOut?, truncated? |
| `LocalCodexRunnerEvent` | type | type, message?, raw? |
| `CodexSandboxMode` | type | `'read-only' \| 'workspace-write'` |
| `RunExecutionService` | class | Orchestrates LocalCodexRunner, emits `run.execution.*` events via RunsGateway; does NOT mutate run state |
| `RunExecutionService.executeRun` | method | Takes `RunExecutionInput`, calls runner, emits started→log→completed/failed events |
| `RunExecutionInput` | type | runId, taskId?, projectId?, agentId?, prompt, cwd, mode? |
| `DialogueService` | class | Office dialogue service; depends on `LLM_TEXT_PROVIDER` injection token, tries provider → returns `source:'llm'` on success, `source:'deterministic'` on fallback |
| `LlmTextProvider` | interface | Provider-neutral text generation interface: `generateText({prompt, maxTokens?}) → {text, model?}` |
| `LlmTextProviderInput` | type | `{ prompt: string; maxTokens?: number }` |
| `LlmTextProviderResult` | type | `{ text: string; model?: string }` |
| `LLM_TEXT_PROVIDER` | constant | NestJS injection token — currently resolved to `ClaudeService` via `useExisting` |
| `ClaudeService` | class | Implements `LlmTextProvider` — Anthropic one-shot + streaming; exported from ClaudeModule |
| `ClaudeService.generateText` | method | One-shot text generation via Anthropic `messages.create`; returns `LlmTextProviderResult` with `model:'claude-sonnet-4-6'` |
| `DialogueController` | class | `POST /dialogue/office` REST endpoint delegating to `DialogueService.generateOfficeDialogue` (async) |
| `DialogueModule` | class | NestJS module wiring `DialogueController` + `DialogueService`, imports `ClaudeModule` |
| `generateOfficeDialogue` | method | Async — tries Claude first (source:'llm', fallbackUsed:false), falls back to deterministic pool |
| `GenerateOfficeDialogueInput` | type | fromAgentId, toAgentId?, officeStatus, recentDialogue?, now?, maxChars? |
| `DialogueResponse` | type | fromAgentId, toAgentId?, text, source: 'deterministic'\|'llm', createdAt, fallbackUsed, errorSummary?, model? |
| `DialogueSource` | type | `'deterministic' \| 'llm'` |
| `buildOfficeDialoguePrompt` | function | Constructs Claude-ready system prompt from agent personas — used by DialogueService for Claude calls |
| `sanitizeDialogueText` | function | Private helper — collapses newlines, strips markdown/code fences/quotes, normalizes whitespace |

### Frontend Dialogue

| Symbol | Kind | Description |
|---|---|---|
| `generateOfficeDialogue` (frontend) | function | Fetch adapter — POSTs to `/api/dialogue/office`, returns `DialogueResponse` or null on failure |
| `GenerateOfficeDialogueRequest` | type | Frontend request shape: fromAgentId, toAgentId?, officeStatus?, recentDialogue?, now?, maxChars? |
| `DialogueResponse` (frontend) | type | Frontend response shape: fromAgentId, toAgentId?, text, source:'llm'\|'deterministic', fallbackUsed, model?, errorSummary? |
