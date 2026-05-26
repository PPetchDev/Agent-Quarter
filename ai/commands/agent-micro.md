# agent-micro

_Use for single-task implementation when target files are already known. Compatible with all agents._

## Trigger — all must be true

- Target files known (from prompt or prior map query)
- Task touches 1–3 product files
- No architecture decision, browser QA, DB migration, or dependency change required
- No multi-agent handoff required

## Steps

1. Read target product files only
2. Implement change
3. Run exact verification commands
4. Report result

## Rules

- Do not read workflow files (`ai/*.md`, `AGENTS.md`, `CLAUDE.md`)
- Do not read command/skill files
- Do not update workflow files
- Copy exact verification command strings in output — PARTIAL if unconfirmed

## Output (≤30 lines)

```
## Status
PASS / PARTIAL / BLOCKED

## Changed
- path — reason

## Verified
- exact command — result

## Next
- recommended next task
```

## Escalate to Lean Mode if

- Scope expands beyond 3 files
- Type errors require broader context
- Architecture decision required
- Browser/runtime QA required
