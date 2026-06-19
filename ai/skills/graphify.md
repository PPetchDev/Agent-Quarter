# Graphify — Targeted Context Retrieval

**Purpose:**
Query the codebase knowledge graph to retrieve targeted, relevant context
without broad file reads. Returns evidence pointers (file paths, relationships)
rather than raw file contents.

---

## When to Use

- When you need to locate where a symbol, module, or concept appears before editing
- When the context packet references a module but you need its file path
- When verifying cross-file dependencies before a patch
- When looking for callers or consumers of a specific function or type
- When the contract scope is narrow and you want precision over breadth

---

## When Not to Use

- Do not use to expand task scope or satisfy curiosity beyond the active contract
- Do not use when the file path is already known from the context packet
- Do not use for documentation-only contracts where no source relationships matter
- Do not use to load large dependency trees when only one file needs changing
- Do not paste graphify output directly into memory or context packets

---

## Token Rules

- Use graphify results as evidence pointers (file path + line range), not copied blocks
- If a graphify query returns a large graph, extract only the relevant nodes
- Do not include raw graphify JSON output in patches or context packets
- Summarize in one line per relevant file: `path/to/file.ts — reason relevant`

---

## Output Rules

- Return file paths and relationships as a compact list
- Annotate each path with why it is relevant to the current task
- Discard nodes unrelated to the active contract scope
- If no relevant results found, state "No relevant nodes found" and proceed without it

---

## Workflow Connection

**Position in Kernel → Contract → Packet → Patch:**

```
Kernel → Contract → Packet → [graphify query here] → Patch
```

- Use graphify during the Packet phase to fill in missing file references
- Use graphify results to populate the "Files In Scope" section of the context packet
- Do not use graphify to bypass the contract — if a file is out of scope, do not query it
- Graphify is a context retrieval tool, not an execution tool
- Results feed into the patch, not into memory directly
