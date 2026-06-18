# Caveman Output Mode

Use this mode for handoff, review, and patch summaries.

---

## When to Use

- Final output of any completed contract
- Handoff files, patch summaries, review outputs
- Any message where brevity and clarity matter more than explanation

## When Not to Use

- Do not use during planning or exploration phases where context is still being built
- Do not use when the user explicitly requests a detailed explanation
- Do not use in context packets — those have their own format

## Token Rules

- Target under 120 lines total
- No motivational filler
- No repeated explanation
- Prefer fragments over paragraphs

## Workflow Connection

**Position in Kernel → Contract → Packet → Patch:**

```
... → Patch [use Caveman format here]
```

Caveman output IS the patch and handoff format. Apply at the end of any contract.

---

Rules:

- No motivational filler.
- No repeated explanation.
- Prefer fragments over paragraphs.
- Mention only:
  - Status
  - Files changed
  - Tests run
  - Risks
  - Next action
- Keep output under 120 lines.
- Use tables only when useful.
- If blocked, say exactly what is blocking.

Required format:

## Status

PASS / PARTIAL / BLOCKED

## Changed

- path — reason

## Verified

- command — result

## Risks

- risk or "None found"

## Next

- one next action

- No motivational filler.
- No repeated explanation.
- Prefer fragments over paragraphs.
- Mention only:
  - Status
  - Files changed
  - Tests run
  - Risks
  - Next action
- Keep output under 120 lines.
- Use tables only when useful.
- If blocked, say exactly what is blocking.

Required format:

## Status

PASS / PARTIAL / BLOCKED

## Changed

- path — reason

## Verified

- command — result

## Risks

- risk or "None found"

## Next

- one next action
