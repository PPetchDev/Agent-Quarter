@AGENTS.md

---

# Claude Code — Boot Rules

## Mode

- Default: **Micro Mode** (see AGENTS.md — Map-First Universal Agent Workflow)
- Use **Map Mode** when target files are unknown → read `ai/maps/` first
- Use **Lean Mode** for multi-file tasks with unknowns
- Workflow files (`ai/context-packet.md`, `ai/active.contract.md`, `ai/kernel.md`, `ai/handoff.md`) — read only in Lean/Full Contract mode

## Language

- Thai for user-facing communication
- English for workflow files, code, and technical docs

## Memory

- Do not rewrite `ai/memory.md` directly — propose via `ai/patches/latest.md`

## Audit

- State PASS / PARTIAL / BLOCKED for every task
- Copy exact verification command strings in final output (see AGENTS.md Audit Rules)
- Check `ai/context-packet.md` Packet ID matches active contract before Lean/Full tasks
