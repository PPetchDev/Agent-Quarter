# ADR-0001 — Kernel → Contract → Packet → Patch Workflow
_Date: 2026-05-23 | Status: Accepted_

---

## Status
**Accepted**

---

## Context
This repo may be worked on by multiple AI tools: Claude Code, Codex, Antigravity, GitHub Copilot, and others.

Without a structured workflow, each agent session risks:
- **Token bloat** — agents load full session histories to understand the task
- **Stale-context contamination** — archived decisions or superseded plans confuse current execution
- **Scope creep** — agents expand beyond the intended task by reading unrelated history
- **Memory drift** — durable facts are lost between sessions or overwritten without review

The previous state had no formal AI workflow files (no AGENTS.md, CLAUDE.md, or session structure).

---

## Decision
Adopt **Kernel → Contract → Packet → Patch** as the standard AI workflow for this repo.

| Layer | File | Purpose |
|-------|------|---------|
| **Kernel** | `ai/kernel.md` | Compact project truth — ≤ 400 words |
| **Contract** | `ai/active.contract.md` | Definition of done + scope boundary |
| **Packet** | `ai/context-packet.md` | Compact execution context for current task |
| **Patch** | `ai/patches/latest.md` | Proposed memory updates after task completion |

Supporting files:
- `ai/memory.md` — durable facts (≤ 1,200 words)
- `ai/backlog.md` — contract-oriented backlog
- `ai/token-budget.md` — token discipline policy
- `ai/handoff.md` — executable handoff between sessions
- `ai/changelog.md` — contract-based change log
- `ai/sessions/archive/` — cold storage (not read by default)

---

## Consequences

### Positive
- Agents execute from compact context packets — token usage stays bounded
- Contracts define done/scope/verification — agents cannot silently expand scope
- Memory updates are proposed as patches — only approved facts survive
- Session archives become cold storage — no default loading of history
- Each agent lane is defined (Claude Code, Codex, Antigravity, Copilot)

### Constraints
- Claude Code is the sole migration agent until C-BOOT-001 passes review
- Other agents introduced only after migration passes formal review
- All agents must follow `AGENTS.md` as shared source of truth
- Direct rewrites of `ai/memory.md` by executor agents are forbidden

### Trade-offs
- More upfront workflow files — paid back by reduced token cost per session
- Compact memory may lose nuance — mitigated by evidence pointers to full docs
