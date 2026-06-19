# /agent-handoff-compact

Purpose:
Compress completed agent work into ai/handoff.md and ai/patches/latest.md.

Use:
- ai/skills/caveman.md

Input files:
- ai/active.contract.md
- ai/active.task.md
- ai/patches/latest.md
- git diff
- test output

Output:
- ai/handoff.md
- ai/patches/latest.md

Rules:
- No broad explanation.
- No tutorial tone.
- Do not invent test results.
- If no tests were run, write "Not run".
