@AGENTS.md
@ai/kernel.md
@ai/context-packet.md
@ai/active.contract.md
@ai/handoff.md

---

# Claude Code — Working Rules

## Identity During Migration

During C-BOOT-001 (AI workflow migration), Claude Code is the **only** migration agent.
Do not delegate to Codex, Antigravity, or GitHub Copilot until C-BOOT-001 passes review.

## Before Every Task

1. Restate the active contract (from `ai/active.contract.md`)
2. Summarize the context packet (from `ai/context-packet.md`)
3. List the files likely to change
4. Confirm what is forbidden scope
5. Propose the smallest safe implementation

## Execution Rules

- Follow `AGENTS.md` as shared source of truth
- Do not read `ai/sessions/archive/` unless `ai/context-packet.md` explicitly references a session
- Do not rewrite `ai/memory.md` directly — use `ai/patches/latest.md` for proposals
- If anything is unclear, improve workflow docs before expanding scope
- Prefer small, reversible changes — one logical change per commit

## Output Rules

- Produce patches in `ai/patches/latest.md`
- Use the Required Output Patch Format from the active context packet
- State `PASS / PARTIAL / BLOCKED` for every completed task

## Language

- Thai for user-facing communication
- English for workflow files, code, and technical docs

## Token Discipline / Lean Mode

- Follow `ai/token-budget.md` at all times.
- Lean Mode is the default unless the user explicitly asks for full mode.
- Read `ai/context-packet.md` first.
- Read only files required by the active contract.
- Do not read all workflow files by default.
- Do not read command/skill files unless they are required or actually used.
- Do not reread command/skill files already read in the same contract.
- Do not rewrite `ai/active.contract.md`, `ai/active.task.md`, or `ai/context-packet.md` unless the contract or scope changes.
- Prefer small patches over full-file rewrites.
- Do not paste raw graphify, browser, console, or session output into working context.
- Do not duplicate `ai/patches/latest.md` in the final chat response.
- If output exceeds 80 lines, compress it.
- If context reaches 60K tokens, stop and suggest compaction.
- If context reaches 90K tokens, stop unless the user explicitly says to continue.
- If context grows large, drop history before dropping contract.

## Audit Rules

**Hard criterion**: Incorrect verification command reporting makes task status PARTIAL — even if code passes.

- Final output must copy **exact** command strings actually executed — including `; echo "EXIT:$?"` suffix if present. Do not normalize or shorten paths.
- If a verification command uses a workspace-specific tsconfig (e.g. `apps/web/tsconfig.json`), report that exact path — never a generic `tsconfig.json`.
- If the exact command string cannot be confirmed, state PARTIAL and note which commands were unconfirmed.
- Before executing a task, check that `ai/context-packet.md` Packet ID matches the active contract ID.
- If the packet is stale (contract ID mismatch): update the packet first, OR explicitly state the mismatch in the response. Never proceed silently on a stale packet.
