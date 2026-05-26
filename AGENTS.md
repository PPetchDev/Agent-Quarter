# AGENTS.md — Anime Agent Squad

_Shared source of truth for all AI agents working in this repo._
_Updated: 2026-05-26_

---

## Prime Directive

This repo is built with a **Kernel → Contract → Packet → Patch** workflow.

No agent may expand scope beyond `ai/active.contract.md`.

---

## Required Context Flow

Every agent must load context in this order:

1. **`ai/kernel.md`** — compact project truth (≤ 400 words)
2. **`ai/active.contract.md`** — current definition of done and scope boundary
3. **`ai/context-packet.md`** — execution context for the current task
4. **`ai/patches/latest.md`** — read for current patch state if continuing a task
5. Do not read `ai/sessions/archive/` unless the context packet explicitly references a session

---

## Execution Rules

- Work from the current context packet — not from memory alone
- If the packet is unclear, improve the packet before implementing
- If the contract is unclear, improve the contract before implementing
- If the task exceeds the contract, stop and request a new contract
- Never expand scope by reading unrelated history
- Prefer file pointers over pasting file contents into context
- Promote only durable facts into memory

---

## Memory Rules

- `ai/memory.md` is compact durable memory — do not paste session logs into it
- Agents must **not** rewrite `ai/memory.md` directly unless explicitly acting as checkpoint/gatekeeper
- Agents **may** propose memory patches in `ai/patches/latest.md`
- Only approved durable facts should be promoted into memory

---

## Session Rules

- `ai/sessions/archive/` is **cold storage**
- Do not read session archives during normal boot
- Read archived sessions only if `ai/active.contract.md` or `ai/context-packet.md` explicitly references them

---

## Stop Conditions

Stop and request review if:

- More than 3–5 files need changes unexpectedly
- A new external dependency seems necessary
- Implementation would exceed the active contract
- Existing architecture conflicts with the contract
- Verification cannot be performed without out-of-scope reads

---

## Agent Lanes

| Agent              | Role                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Claude Code**    | Contract compilation · context packet compilation · architecture reasoning · review · gatekeeping · memory compression · focused execution |
| **Codex**          | Focused implementation · tests · type cleanup · small bug fixes _(future)_                                                                 |
| **Antigravity**    | UI shell · layout · live preview · interaction prototypes _(future)_                                                                       |
| **GitHub Copilot** | Inline completion · helper functions · small local edits _(future)_                                                                        |

**During migration (C-BOOT-001): Claude Code is the only active agent.**
Other agents are introduced only after C-BOOT-001 passes review.

---

## Command / Skill Layer

This repo uses a command/skill layer on top of the Kernel → Contract → Packet → Patch workflow.
Commands are selected by active contract type — not run by default.

### Commands

- **`ai/commands/agent-context.md`**
  - Use for compact context generation before implementation.
  - Prefer graphify query before broad source reading.

- **`ai/commands/agent-run.md`**
  - Use for one scoped contract implementation task.
  - Follows: context → inspect → patch → verify → handoff.

- **`ai/commands/agent-review.md`**
  - Use to review patches against the active contract.
  - Inputs: contract, task, patch, git diff, test output.

- **`ai/commands/agent-ui-polish.md`**
  - Use only when UI polish is explicitly in contract scope.
  - Forbidden: new business logic, large redesigns, removing features.

- **`ai/commands/agent-browser-debug.md`**
  - Use only when browser/runtime behavior must be verified.
  - Prerequisites: dev server running, Chrome DevTools Protocol connected.

- **`ai/commands/agent-handoff-compact.md`**
  - Use after work completes to compress results into handoff and patch output.
  - Produces: ai/handoff.md, ai/patches/latest.md.

### Skills

- **`ai/skills/caveman.md`** — compact output mode for handoff and patch summaries.
- **`ai/skills/graphify.md`** — targeted codebase/context retrieval. Prefer over broad file reads.
- **`ai/skills/impeccable.md`** — UI visual quality review. Use only when UI polish is in scope.
- **`ai/skills/browser-harness.md`** — browser/runtime UI debug. Use only for verified UI bugs.

### Tool Routing Rules

- Do not run all commands by default.
- Select the smallest command path required by the active contract.
- Graphify is for targeted retrieval, not broad exploration.
- Browser-harness is for runtime UI verification, not normal code reading.
- Impeccable-style review is for UI polish, not backend or domain work.
- Caveman-style output should be used for final summaries and handoff.
- Tool output must not be copied raw into memory.
- Durable facts must be promoted through patch proposals only.
- Contract scope has priority over command behavior.
- Context packet has priority over broad source reading.
- Token budget has priority over curiosity.

---

## Lean Mode / Token Governor

_Added: C-WORKFLOW-004 (2026-05-26)_

Rules:

- Default to Lean Mode after the workflow has already been bootstrapped.
- Do not reread full workflow files if `ai/context-packet.md` already contains the required routing.
- Do not rewrite `ai/active.contract.md`, `ai/active.task.md`, or `ai/context-packet.md` unless the contract changes.
- Prefer patching existing workflow files over full rewrites.
- Read command/skill files only when they are required by the active contract.
- If a skill was already read in the same contract, do not reread it.
- Do not paste raw tool output into `ai/patches/latest.md`.
- Final output should not duplicate `ai/patches/latest.md`.
- Use compact final output by default.
- If output exceeds 120 lines, compress it.
- If context usage is high, stop and ask to compact before continuing.

Token Thresholds:

- Normal task target: under 20K tokens.
- Browser/runtime task target: under 35K tokens.
- Stop-and-compact threshold: 60K tokens.
- Hard stop threshold: 90K tokens unless user explicitly continues.

---

## Audit Rules

_Added: C-WORKFLOW-005 (2026-05-26)_

### Exact Verification Command Reporting

**Hard Acceptance Criterion** — Incorrect command reporting makes task status PARTIAL regardless of code outcome.

- Final output (patches/latest.md, handoff.md, chat response) must copy the **exact** command string that was actually executed — including all flags and `; echo "EXIT:$?"` suffix if present.
- Do not shorten, normalize, or rewrite command paths.
- If a verification command includes a workspace-specific tsconfig path (e.g. `apps/web/tsconfig.json`, `packages/core/tsconfig.json`), report that exact path — not a generic `tsconfig.json`.
- Correct: `pnpm exec tsc -p apps/web/tsconfig.json --noEmit; echo "EXIT:$?"`
- Incorrect: `pnpm exec tsc -p tsconfig.json --noEmit`
- If the exact command string cannot be confirmed from terminal output, state `PARTIAL` and note which commands were not verified.

### Context Packet Freshness

- Before executing any task, verify that `ai/context-packet.md` Packet ID matches the active contract ID.
- If the packet contract ID does not match the requested/active contract:
  1. Update `ai/context-packet.md` to reflect the new contract **before** starting implementation, OR
  2. Explicitly state in the response that the packet is stale, name the mismatch (e.g. "packet says C-WORKFLOW-004, contract is C-WORKFLOW-005"), and proceed only if the user prompt provides sufficient scope to continue without the packet.
- Never continue silently on a stale packet.

---

## Legacy Workflow Fallback

The previous workflow had no formal AGENTS.md or session structure.
If the new workflow causes issues, fall back to reading `docs/superpowers/specs/` and `docs/superpowers/plans/` directly.
Do not delete these files.
