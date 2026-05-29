# agent-map

_Use when target files are unknown. Compatible with all agents._

## Purpose

Locate target files and symbols before implementing. Prevents blind code search.

## Steps

1. Read `ai/maps/repo-map.md` — find directory location
2. Read `ai/maps/feature-map.md` — find feature files
3. Read `ai/maps/symbol-index.md` — find exact symbol if needed
4. Read `ai/maps/api-map.md` — find endpoint/event if needed
5. If not found in maps → run one targeted graphify query
6. Report: confirmed file paths + symbol names

## Output

```
## Map Result
- target: path/to/file.ts — reason
- symbol: FunctionName — path/to/file.ts
```

## Rules

- Do not read source files during map phase
- Do not run more than one graphify query
- If a new file location is confirmed, propose map update in output
- Escalate to Lean Mode only if maps + graphify both insufficient

## Token Budget

Map phase target: <5K tokens.
