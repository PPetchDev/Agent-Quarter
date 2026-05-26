# Test Map

_Updated: C-WORKFLOW-009_

## packages/core

- Test count: 37 passing (verified C-RUN-004)
- Location: `packages/core/src/__tests__/`
- Files: `emotion-parser.test.ts`, `project-lifecycle.test.ts`, `stage-tracker.test.ts`
- Coverage: emotion parser, run lifecycle, stage tracker

## apps/api

- No tests verified yet

## apps/web

- Location: `apps/web/src/components/lounge/furnitureCatalog.test.ts`

## Standard Verification Commands

```bash
pnpm exec tsc -p apps/api/tsconfig.json --noEmit; echo "EXIT:$?"
pnpm exec tsc -p apps/web/tsconfig.json --noEmit; echo "EXIT:$?"
pnpm exec tsc -p packages/core/tsconfig.json --noEmit; echo "EXIT:$?"
pnpm install
pnpm dev
```
