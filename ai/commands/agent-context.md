# /agent-context

Purpose:
Build compact project context before running an agent task.

Steps:

1. Read:
   - ai/active.contract.md
   - ai/active.task.md
   - ai/memory.md
   - ai/handoff.md
2. Query graphify before reading large source files.
3. Prefer graphify query/path results over broad grep.
4. Produce ai/context-packet.md with:
   - Relevant files
   - Relevant symbols
   - Current constraints
   - Known risks
   - Recommended next task scope

Suggested graphify commands:

```bash
graphify update .
graphify query "<task-specific question>"
graphify path "<symbol A>" "<symbol B>"
```
