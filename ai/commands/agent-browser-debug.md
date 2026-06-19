# /agent-browser-debug

Purpose:
Debug frontend behavior with browser-harness.

Prerequisites:
- Dev server running
- Browser connected through Chrome DevTools Protocol
- Target URL known

Inputs:
- ai/active.contract.md
- ai/active.task.md
- ai/context-packet.md
- browser console
- DOM/canvas state
- screenshot if needed

Required process:
1. Reproduce bug in browser.
2. Capture console/runtime evidence.
3. Map evidence to source file.
4. Make minimal patch.
5. Re-test in browser.
6. Write result to ai/patches/latest.md.

Output:
- Bug cause
- Files changed
- Browser evidence
- Verification result
