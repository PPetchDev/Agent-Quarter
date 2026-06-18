# /agent-run

Purpose:
Run one scoped contract task safely.

Required order:
1. Read ai/active.contract.md
2. Read ai/active.task.md
3. Run /agent-context behavior
4. Inspect only relevant files
5. Patch minimally
6. Run typecheck/test/lint when available
7. If frontend behavior is affected, run /agent-browser-debug behavior
8. If UI is affected, run /agent-ui-polish behavior
9. Run /agent-handoff-compact behavior

Rules:
- Stay inside active contract.
- Do not edit unrelated files.
- Do not skip verification silently.
- Keep output compact.
- Update ai/patches/latest.md and ai/handoff.md.
