# C-MOOD-001 — Character Mood Animation (Float Loop + Enhanced Glow)

## Type
IMPLEMENT

## Mode
Full Contract

## Goal
Add gentle Y-axis float (bobbing) to Spine characters in the lounge, with speed and amplitude varying by agent state. Enhance existing alpha breath glow with state-based intensity scaling.

## User Evidence
- Design spec §2.1: "Animation: float loop ตลอดเวลา, ความเร็วและ glow ตาม agent state (working/idle/sleeping)"
- Backlog Parking Lot: "Character mood animation (float loop, glow based on agent state)"
- Azur Lane dorm: characters continuously bob up and down with subtle glow pulses

## Current State (Investigation Findings)

### Already exists:
- **Alpha breath glow** (LoungeCanvas.tsx:780-808): Per-character RAF loop with `display.alpha` oscillation. Period varies by state: working=1.8s, idle=3s, resting=4s. Range: 0.88–1.0.
- **SPINE_ANIM_CANDIDATES** (LoungeCanvas.tsx:711-728): Maps AgentState → Spine animation priority lists. Idle includes `yun` (dreamy float) and `dance`.
- **Spine character rendering**: 5 characters rendered via `charSpritesRef` with position tracking.

### Missing:
- **Y-axis float (bobbing)**: Azur Lane-style gentle up/down position oscillation — NOT implemented
- **Glow intensity variation**: Currently only alpha 0.88–1.0 for all non-walking states — could enhance with amplitude/intensity scaling per state
- **Color tint glow**: No per-state color overlay (e.g., warm yellow for coding, blue for resting)

## Scope (Single Slice)

### Float Loop
- Add continuous Y-axis bobbing to all 5 Spine characters
- Float amplitude varies by state: idle=2px, working=4px, resting=1px, walking=0px
- Float speed varies by state: idle=3s period, working=1.5s period, resting=5s period
- Float is ADDITIVE to existing spine.y position (characters already positioned via projection)
- Use separate RAF from existing glow loop for clean separation

### Enhanced Glow
- Increase alpha range for working states: 0.80–1.0 (more pronounced)
- Add per-state glow intensity multiplier: working=1.0, idle=0.6, resting=0.3
- Keep existing `walking`/`error` behavior (alpha=1.0, no float)

## Files In Scope
- `apps/web/src/components/lounge/LoungeCanvas.tsx` (float + glow RAF)
- `apps/web/src/components/lounge/spineAgents.ts` (float config constants)
- `ai/active.contract.md`, `ai/context-packet.md`, `ai/handoff.md`, `ai/changelog.md`

## Out Of Scope
- Backend/API changes
- `packages/core` changes (mood system is stable)
- New Spine assets or animations
- Color tint / glow color overlay (deferred to future contract)
- Float on HTML avatar fallbacks (Spine-only)

## Acceptance Criteria
- [ ] All 5 Spine characters gently bob up/down continuously
- [ ] Float amplitude: idle=2px, working=4px, resting=1px, walking=0px
- [ ] Float speed: idle=3s, working=1.5s, resting=5s
- [ ] Alpha breath: working=0.80–1.0 (enhanced), idle=0.88–1.0 (unchanged), resting=0.92–1.0 (subtle)
- [ ] Walking/error: no float, alpha=1.0
- [ ] No visual glitches when state transitions
- [ ] All existing tests pass + new float unit test
- [ ] TypeScript clean

## Verification Commands
```bash
pnpm --filter @squad/web test -- --run; echo "EXIT:$?"
pnpm exec tsc -p apps/web/tsconfig.json --noEmit; echo "EXIT:$?"
pnpm lint; echo "EXIT:$?"
```

## Stop Conditions
- Stop if Spine character position glitches (characters jump/drift)
- Stop if tests regress
- Stop if any new dependencies needed
