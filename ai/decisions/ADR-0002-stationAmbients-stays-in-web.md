# ADR-0002 — `stationAmbients` stays in `apps/web` (not promoted to `packages/core`)

## Status

Accepted — 2026-05-29

## Context

C-STATION-AMBIENT-003 extracted `AmbientShape` + `STATION_AMBIENTS` from
`pixiRoom.ts` into `apps/web/src/components/lounge/stationAmbients.ts`. The
patch report flagged a residual risk: the module is still scoped to the web
app's lounge directory. Promotion to `packages/core` would allow sharing
across packages.

The Phase 2 build boundary (kernel) is:

- Frontend: Lounge (PixiJS) + Stage chat panel
- Backend: Nest.js gateway for Claude API streaming
- `packages/core`: character templates, mood, run/task/project domain

Backend never renders the lounge. There is no second consumer today.

## Decision

Keep `stationAmbients` in `apps/web/src/components/lounge/`. Do not promote
to `packages/core` until a second consumer materialises (e.g., a server-side
preview generator, an analytics scoring service, or a second UI surface like
a mobile shell).

## Consequences

Positive:

- Avoids adding a `packages/core` lounge subdir whose only purpose is
  pre-emptive sharing.
- Keeps the lounge front-end concerns colocated.
- Preserves the unit-testability already won by extracting the module from
  `pixiRoom.ts`.
- Reduces build coupling: `packages/core` does not gain a dependency on
  `RoomObject` or `FURNITURE_DIMS`.

Negative:

- If a second consumer needs the table later, it must either move the module
  or duplicate the data.
- Imports of `STATION_AMBIENTS` are scoped to `apps/web`; that is currently
  fine and is enforced by the existing module path.

## Promotion trigger

Promote when **any** of the following is true:

1. A second app (mobile, devtools, server preview) needs the table.
2. The lounge backend renders or validates ambient overlays.
3. A new `packages/lounge-core` is created to host shared geometry types.

When promoting:

1. Move `stationAmbients.ts` and `roomDefs.ts` (or just `FURNITURE_DIMS`) to
   `packages/core/src/lounge/`.
2. Re-export from `packages/core/src/index.ts`.
3. Update `apps/web` imports to use `@squad/core`.
4. Keep the existing structural + applyStationAmbient tests passing.

## Related

- C-STATION-AMBIENT-003 — original extraction.
- C-AGENT-RISKS-002 — closes the deferred-promotion risk via this ADR.
