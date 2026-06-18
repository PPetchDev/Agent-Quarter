# Impeccable-inspired UI Review

Purpose:
Review frontend/game UI for visual quality, hierarchy, interaction clarity, and non-generic design.

---

## When to Use

- The active contract explicitly includes UI polish or visual quality review
- A component or screen fails basic visual hierarchy, spacing, or accessibility standards
- Pre-release visual QA pass on React components or PixiJS UI

## When Not to Use

- Do not apply UI polish to backend or domain contracts
- Do not redesign the product unless the active contract explicitly allows it
- Do not use during feature implementation phases (backend, API, data model)
- Do not use for workflow-only contracts (like C-WORKFLOW-\*)

## Token Rules

- Limit to top 3–5 visual issues per review
- Do not paste raw DOM or CSS into memory
- Return results as compact verdict + issue list + patch plan

## Workflow Connection

**Position in Kernel → Contract → Packet → Patch:**

```
Contract (UI polish) → Packet → [impeccable review here] → Patch
```

Only activated when the active contract specifies UI polish scope.
Result feeds into the patch as a compact verdict. Do not copy raw review output into memory.

---

Use this for:

- React components
- PixiJS UI
- Game-like dashboard
- Isometric room UI
- Sprite/animation preview tools

Review dimensions:

1. Visual hierarchy
2. Layout rhythm
3. Spacing consistency
4. Typography scale
5. Color contrast
6. Interaction affordance
7. Empty/loading/error states
8. Responsiveness
9. Anti-generic checks
10. Implementation simplicity

Anti-patterns:

- Generic SaaS gradient hero
- Too many nested cards
- Low-contrast gray text
- Decorative icons with no information value
- Same radius/shadow everywhere
- Centered everything
- UI polish that breaks usability

Output format:

## UI Verdict

PASS / NEEDS POLISH / FAIL

## Top Issues

1. ...
2. ...
3. ...

## Patch Plan

- file/path — change

## Acceptance Criteria

- ...

- React components
- PixiJS UI
- Game-like dashboard
- Isometric room UI
- Sprite/animation preview tools

Review dimensions:

1. Visual hierarchy
2. Layout rhythm
3. Spacing consistency
4. Typography scale
5. Color contrast
6. Interaction affordance
7. Empty/loading/error states
8. Responsiveness
9. Anti-generic checks
10. Implementation simplicity

Anti-patterns:

- Generic SaaS gradient hero
- Too many nested cards
- Low-contrast gray text
- Decorative icons with no information value
- Same radius/shadow everywhere
- Centered everything
- UI polish that breaks usability

Output format:

## UI Verdict

PASS / NEEDS POLISH / FAIL

## Top Issues

1. ...
2. ...
3. ...

## Patch Plan

- file/path — change

## Acceptance Criteria

- ...
