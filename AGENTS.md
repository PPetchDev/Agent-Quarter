# AGENTS.md — Anime Agent Squad

_Shared source of truth for all AI agents working in this repo._
_Updated: 2026-05-26 | Workflow: Map-First Universal Agent Workflow (C-WORKFLOW-009)_

---

## Prime Directive

**Mode → Map → Minimal Context → Patch**

No agent may expand scope beyond the active contract.
No agent reads source files blindly — use `ai/maps/` first.

---

## Map-First Universal Agent Workflow

_Added: C-WORKFLOW-009_

### Core Pattern

```
1. Select Mode   — based on task scope
2. Load Map      — ai/maps/ before any source read
3. Load Minimal Context — only files the map points to
4. Patch         — produce output in standard format
```

### Mode Selection

| Mode              | Trigger                                             | Workflow Files Read             |
| ----------------- | --------------------------------------------------- | ------------------------------- |
| **Micro**         | Files known · 1–3 files · no arch/QA/DB/dep/handoff | None                            |
| **Map**           | Files unknown — locate before read                  | `ai/maps/` only                 |
| **Lean**          | Multi-file · unknowns · known contract              | context-packet + required reads |
| **Full Contract** | New contract · arch decision · multi-agent handoff  | Full context flow               |

**Default: Micro Mode.** Escalate only when conditions require it.

### Micro Mode

- Do not read workflow files (`ai/*.md`, `AGENTS.md`, `CLAUDE.md`)
- Do not read command/skill files
- Read only product files required for the task
- Run exact verification commands
- Final output: ≤30 lines

### Map Mode

- Read `ai/maps/` to locate target files before any source read
- Use graphify only if maps insufficient (≤1 query)
- Do not read workflow files beyond what mode requires
- Final output: ≤40 lines

### Lean Mode

- Read `ai/context-packet.md` first
- Read only files listed in Required Reads of packet
- Do not reread files already read in this session
- Do not rewrite workflow files unless scope changes
- Final output: ≤80 lines

### Full Contract Mode

- Read: kernel → contract → packet → required reads
- Update workflow files as contract requires
- Multi-agent handoff allowed
- Final output: ≤120 lines

### Token Budgets

| Mode          | Target | Hard Stop                 |
| ------------- | ------ | ------------------------- |
| Micro         | <10K   | 20K                       |
| Map           | <15K   | 30K                       |
| Lean          | <20K   | 90K (stop-compact at 60K) |
| Full Contract | <35K   | 90K (stop-compact at 60K) |

### No Blind Search Rule

**Never search source files without a map query first.**

1. Check `ai/maps/` for the file/symbol location.
2. If maps insufficient, use graphify for targeted retrieval.
3. Only read source files after location is confirmed.

### Exact Verification Command Rule

**Hard Criterion** — Incorrect command reporting makes status PARTIAL regardless of code outcome.

- Copy the **exact** command string executed — all flags, exact paths, `; echo "EXIT:$?"` if used.
- Workspace-specific tsconfig paths must be exact: `apps/web/tsconfig.json` not `tsconfig.json`.
- If exact string unconfirmed: state PARTIAL and note which commands were unconfirmed.

### Command / Skill Routing

| Context            | Command               | Skill                            |
| ------------------ | --------------------- | -------------------------------- |
| Micro Mode         | none                  | none                             |
| Files unknown      | `agent-map`           | `graphify` (if map insufficient) |
| Single impl task   | `agent-run`           | —                                |
| UI polish          | `agent-ui-polish`     | `impeccable`                     |
| Browser QA         | `agent-browser-debug` | `browser-harness`                |
| Code review        | `agent-review`        | —                                |
| Close out          | `agent-closeout`      | `caveman`                        |
| Context generation | `agent-context`       | `graphify`                       |

Do not run commands by default. Select only what the task requires.

### Universal Agent Compatibility

These rules apply to all agents (Claude Code, Codex, Copilot, Antigravity, etc.):

- All commands are plain markdown — no Claude-specific tool assumptions
- Mode selection is scope-driven, not agent-type-driven
- `ai/maps/` is the shared retrieval layer for all agents
- Verification commands are plain shell strings — copy exact
- Patch format is universal markdown

---

## Agent Lanes

| Agent              | Role                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| **Claude Code**    | Contract compilation · architecture · review · gatekeeping · memory compression · focused execution |
| **Codex**          | Focused implementation · tests · type cleanup · small bug fixes                                     |
| **Antigravity**    | UI shell · layout · live preview · interaction prototypes                                           |
| **GitHub Copilot** | Inline completion · helper functions · small local edits                                            |

During C-BOOT-001: Claude Code is the sole active agent. Others introduced after review.

---

## Maps

`ai/maps/` is the shared retrieval layer. Read maps before reading source files.

| Map               | Purpose                                |
| ----------------- | -------------------------------------- |
| `repo-map.md`     | Directory structure and package layout |
| `feature-map.md`  | Feature → file mapping                 |
| `symbol-index.md` | Key types, functions, constants        |
| `api-map.md`      | API endpoints and socket events        |
| `test-map.md`     | Test files and verification commands   |

Keep maps compact. Update when file locations change.

---

## Memory Rules

- `ai/memory.md` — compact durable memory; do not paste session logs
- Agents must not rewrite `ai/memory.md` directly — propose via `ai/patches/latest.md`
- Only approved durable facts promoted into memory

---

## Session Rules

- `ai/sessions/archive/` — cold storage; do not read by default
- Read archives only if `ai/active.contract.md` or `ai/context-packet.md` explicitly references them

---

## Stop Conditions

Stop and request review if:

- More than 3–5 files need unexpected changes
- New external dependency required
- Implementation would exceed active contract
- Existing architecture conflicts with contract
- Verification requires out-of-scope reads

---

## Audit Rules

_Added: C-WORKFLOW-005. Strengthened: C-WORKFLOW-006. Unified: C-WORKFLOW-009._

### Exact Verification Command Reporting

See "Exact Verification Command Rule" above (Map-First section). Same rule — stated once.

### Context Packet Freshness (Lean / Full Contract modes only)

- Verify `ai/context-packet.md` Packet ID matches active contract ID before executing.
- If stale: update packet first, OR explicitly state the mismatch. Never proceed silently.

---

## Output Format (all modes)

```
## Status
PASS / PARTIAL / BLOCKED

## Changed
- path — reason

## Verified
- exact command — result

## Risks
- ...

## Next
- recommended next task
```

---

## Legacy Workflow Fallback

If this workflow causes issues, fall back to `docs/superpowers/specs/` and `docs/superpowers/plans/`.
Do not delete these files.

---

## Semantic Code Search (claude-context)

_Hermes `claude-context` MCP — local Milvus + Ollama embeddings. This repo is indexed (path `/Users/titiwat/Downloads/AnimeAgentSquad`)._

- **Map-first still applies.** Read `ai/maps/` first to scope the target, then use semantic `search_code` to pinpoint exact code — instead of blind source reads or broad grep.
- The MCP needs local Milvus running. Run `code-search status` first and proceed only on `Milvus: healthy`; if down, run `code-search on` and wait. Never call the MCP tools while Milvus is down — it closes the session transport. See the global grounding rules / `code-search` skill for the start + `/reload-mcp` recovery procedure. Do not restart the gateway.
- Re-index after large code changes.
