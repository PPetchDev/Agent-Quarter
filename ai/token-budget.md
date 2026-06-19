# Token Budget Policy

_Applies to all agent context packets in this repo._

## Normal Packet Target

**1,500 – 3,000 words** per execution context packet.

## Packet Allocation

| Slice               | Budget |
| ------------------- | ------ |
| Kernel summary      | 10%    |
| Contract summary    | 25%    |
| Task details        | 25%    |
| Relevant memory     | 20%    |
| Evidence pointers   | 10%    |
| Output requirements | 10%    |

## Hard Rules

- **Do not** include full session logs in any packet
- **Do not** read `ai/sessions/archive/` by default during boot
- **Prefer** evidence pointers (file path + line range) over copied history
- **Include only** active decisions relevant to the current task
- **Include only** unresolved issues that affect the current task
- **Use deltas** for checkpointing — never paste full file contents into memory

## Context Reduction Ladder

If the packet exceeds budget:

1. Drop historical explanation first
2. Keep contract and verification criteria
3. Keep current state summary
4. Replace implementation details with file pointers
5. If still too large → ask for a narrower task scope before proceeding

## Agent Self-Check Before Starting

Before executing, each agent must confirm:

- [ ] Packet is under 3,000 words
- [ ] No session archives loaded
- [ ] Only active contract referenced
- [ ] Memory slice contains only relevant facts
- [ ] Output will be a patch, not a direct memory rewrite

---

## Command / Skill Token Policy

- Do not run all commands by default — select only what the active contract requires.
- Prefer targeted graphify queries over broad file reads.
- Keep graphify output as evidence pointers, not copied context.
- Browser-harness output should be summarized into findings, not pasted raw.
- UI polish review should produce actionable issues only — not full component dumps.
- Caveman-style output should be used for handoff and patch summaries.

If command output is large:

1. Summarize findings
2. Keep file/symbol pointers
3. Drop raw logs
4. Promote only durable facts through patch proposals

### Per-Command Token Guidance

| Command               | When to run                                               | Token impact                          |
| --------------------- | --------------------------------------------------------- | ------------------------------------- |
| agent-context         | Before implementation if source relationships are unclear | Low — produces pointers               |
| agent-run             | One scoped implementation task                            | Medium                                |
| agent-review          | After implementation when review is required              | Low — produces verdict                |
| agent-ui-polish       | Only when UI polish is in contract scope                  | Medium                                |
| agent-browser-debug   | Only when runtime browser verification is required        | High — limit to bug reproduction only |
| agent-handoff-compact | After work completes                                      | Low — compresses output               |

---

## Lean Mode Budget

_Added: C-WORKFLOW-004 (2026-05-26)_

Default reads:

- `AGENTS.md` only if routing rules are needed
- `ai/kernel.md` summary only
- `ai/memory.md` relevant section only
- `ai/active.contract.md`
- `ai/context-packet.md`
- `ai/handoff.md` latest section only

Avoid:

- full changelog reads
- full skill reads unless required by active contract
- full command reads unless required by active contract
- repeated source chunks
- repeated final summaries

Output limits:

- `ai/patches/latest.md`: max 120 lines unless contract requires more
- final chat output: max 80 lines
- `ai/handoff.md`: max 40 lines per update
- `ai/memory.md` patch: max 5 bullets
- changelog entry: max 5 bullets
