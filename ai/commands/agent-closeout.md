# agent-closeout

_Use after task completes to compress results into durable workflow state. Compatible with all agents._

## Purpose

Produce compact handoff and patch output. Prevent context bloat from raw terminal/tool output.

## Steps

1. Confirm task status (PASS / PARTIAL / BLOCKED)
2. Run final verification commands — copy exact command strings
3. Update `ai/patches/latest.md` (≤120 lines, no raw tool output)
4. Update `ai/handoff.md` (≤40 lines)
5. Propose memory patches if durable facts emerged

## Rules

- Do not paste raw terminal/browser/graphify output into patches
- Do not duplicate `ai/patches/latest.md` in final chat response
- Exact command strings required — state PARTIAL if unconfirmed
- Use caveman skill for compact summary if output is long
- Update `ai/maps/` if file locations changed during the task

## Output

```
## Status
PASS / PARTIAL / BLOCKED

## Changed
- path — reason

## Verified
- exact command — EXIT:0

## Memory Proposals
- (durable facts only — omit if none)

## Next
- recommended next contract
```
