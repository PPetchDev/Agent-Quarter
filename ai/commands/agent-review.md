# /agent-review

Purpose:
Review the current patch against the active contract.

Inputs:
- ai/active.contract.md
- ai/active.task.md
- ai/context-packet.md
- ai/patches/latest.md
- git diff
- test output

Review dimensions:
1. Contract compliance
2. Scope control
3. Source correctness
4. Test/verification quality
5. UI quality if applicable
6. Handoff quality

Use tools:
- graphify for code relationship questions
- impeccable-style review for UI changes
- browser-harness for runtime UI bugs
- caveman output for final summary

Output:
## Verdict
PASS / PASS WITH NOTES / FAIL

## Findings
- severity — file — issue

## Required Fixes
- ...

## Optional Improvements
- ...
