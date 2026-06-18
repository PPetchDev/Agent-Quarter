# Browser Harness Debug Skill

Purpose:
Use a real browser to validate UI, console errors, DOM state, and interaction flow.

---

## When to Use

- React UI not rendering or behaving incorrectly at runtime
- PixiJS canvas blank, sprite issues, or animation failures
- Console errors that cannot be diagnosed from static code review
- Button or interaction event bugs requiring live verification
- CSS/layout visual issues requiring screenshot comparison

## When Not to Use

- Do not run for normal static code review or documentation contracts
- Do not use when the bug can be diagnosed from source code alone
- Do not use for workflow-only contracts (like C-WORKFLOW-\*)
- Do not use before confirming the dev server and browser prerequisites are met

## Token Rules

- Do not paste raw browser console logs into memory or context packets
- Summarize findings: one line per issue with file + symptom
- Screenshots are evidence pointers, not embedded data
- Cap browser debug session to the specific interaction failing

## Workflow Connection

**Position in Kernel → Contract → Packet → Patch:**

```
Contract (runtime UI bug) → Packet → [browser-harness debug here] → Patch
```

Only activated when the active contract includes browser/runtime verification.
Findings feed into the patch. Do not copy raw logs into memory.

Prerequisites:

- Dev server running (`pnpm dev`)
- Browser connected via remote debugging or Playwright

---

Use for:

- React UI not rendering
- PixiJS canvas blank
- Sprite sheet preview broken
- Button/event interaction bugs
- CSS/layout visual issues

Debug loop:

1. Open target URL.
2. Capture console errors.
3. Inspect DOM/canvas state.
4. Reproduce user action.
5. Identify failing file/function.
6. Patch minimally.
7. Reload and verify.

Rules:

- Do not rewrite unrelated UI.
- Do not hide errors.
- Do not rely only on static code reading.
- Screenshot when visual alignment matters.
- Preserve existing workflow files.

- React UI not rendering
- PixiJS canvas blank
- Sprite sheet preview broken
- Button/event interaction bugs
- CSS/layout visual issues

Debug loop:

1. Open target URL.
2. Capture console errors.
3. Inspect DOM/canvas state.
4. Reproduce user action.
5. Identify failing file/function.
6. Patch minimally.
7. Reload and verify.

Rules:

- Do not rewrite unrelated UI.
- Do not hide errors.
- Do not rely only on static code reading.
- Screenshot when visual alignment matters.
- Preserve existing workflow files.
