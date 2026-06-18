# Game Simulation Patterns — Reference Mining from killop/anything_about_game

> Research Date: 2026-06-02
> Source: https://github.com/killop/anything_about_game
> Scope: Pattern extraction only — no dependency migration

---

## 1. Isometric / Grid Pathfinding for Office Agents

### Core Algorithms Identified

| Pattern | Reference | Applicability |
|---------|-----------|---------------|
| **A\* with JPS** | PathFinding.js, JPS-Unity | Classic grid pathfinding; JPS optimizes open-set on uniform grids |
| **Flow Field** | NativeFlowField | Multi-agent movement on same grid; precompute direction vectors once |
| **Context Steering** | ContextSteering-Unity | Local avoidance + interest/danger maps; natural movement |
| **RVO2** | RVO2-CS, RVO2-Unity | Reciprocal collision avoidance between moving agents |
| **NavMesh (Recast)** | DotRecast (.NET), recastnavigation | Polygonal navmesh from grid; runtime dynamic obstacles |
| **Formation Movement** | Unity-Formation-Movement2.0 | Group movement maintaining relative positions |

### Isometric-Specific

- **IsoSorting** (ECS-based): Sorts sprites by y-axis for correct depth layering
- **Isometric Tilemap**: Unity's official approach — tilemap + isometric Z-as-Y
- **Sorting tip**: y-sort based on pivot point at feet, not center

### Recommendation for AnimeAgentSquad

```
Grid: 2D tilemap with isometric projection
Pathfinding: A* on grid → simplify to 8-direction movement
Avoidance: Context Steering (lightweight, no physics deps)
Sorting: y-sort by entity.baseY (feet position)
```

---

## 2. Agent-to-Agent Dialogue Systems

### Patterns Identified

| Pattern | Reference | Key Idea |
|---------|-----------|----------|
| **Node-based Dialogue** | Dialogue-Node-System, Next-Gen-Dialogue | Graph of dialogue nodes with conditions/triggers |
| **LLM-powered Chat** | UniChat, ChatdollKit | Free-form dialogue via LLM; character personality in system prompt |
| **Visual Novel Engine** | Nova (Lunatic-Works) | Script-driven dialogue with branching, character portraits |
| **In-world Chat** | Nakama (chat API) | Realtime chat rooms; guild/group channels |

### Architecture Pattern

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Agent A       │    │ Dialogue Bus  │    │ Agent B       │
│ (Speaker)     │───▶│ (Event/Topic) │───▶│ (Listener)    │
└──────────────┘    └──────────────┘    └──────────────┘
       │                   │                    │
       ▼                   ▼                    ▼
  [System Prompt]    [Topic Filter]      [Response Gen]
  + Memory           + Context           + Animation Trigger
```

### Recommendation

```
Transport: Socket.io namespace /dialogue
Message schema: { speakerId, listenerId?, topic, content, timestamp }
AI layer: LLM system prompt per agent persona
Display: Chat bubble above agent sprite (like officeChat in LoungeCanvas)
```

---

## 3. LLM / Game AI Command Patterns

### Architectures Found

| Pattern | When to Use | Reference |
|---------|-------------|-----------|
| **Behavior Tree** | Complex sequential + conditional logic | EntitiesBT, BehaviorDesigner |
| **GOAP** | Agent decides sequence to achieve goal | crashkonijn/GOAP, AkiGOAP |
| **Utility AI** | Score-based action selection | — |
| **FSM / HFSM** | Simple state-driven behavior | UnityHFSM, NxGraph |
| **LLM Command Interpreter** | Natural language → game action | agentcore-ai, Microverse |

### LLM Command Pipeline (from agentcore-ai pattern)

```
User Text ──▶ [LLM] ──▶ Structured Command ──▶ [Command Router] ──▶ Game Action
                │         { action, target, params }         │
                ▼                                            ▼
         [Context: world state,                 [Action Handlers:
          agent state, inventory]                move, talk, use, wait]
```

### Command Examples (extracted from Skill Editor patterns)

```
skill(1000) {
  FaceToTarget(0)
  PlayAnimation(1, Skill_1)
  Bullet(1.3, Bullet, 7)
  PlayEffect(0, Explode8, 3)
}
```

### Recommendation

```
Layer 1: REST API translates LLM text → { command, params }
Layer 2: Command Router dispatches to TaskService
Layer 3: AgentStateMachine executes command via animation + movement
Example: "move to desk" → { command: "MOVE", target: { x: 5, y: 3 } }
```

---

## 4. 2D Character Movement & Animation State Machines

### State Machine Patterns

| Implementation | Language | Features |
|---------------|----------|----------|
| **UnityHFSM** | C# | Hierarchical states, triggers, timers |
| **NxGraph** | .NET 8 | Zero-allocation, high-performance FSM |
| **appccelerate/statemachine** | C# | Async FSM with entry/exit actions |
| **Animancer** (concept) | C# | Play-on-demand, no Mecanim controller |

### Sprite Animation Approaches

| Pattern | Reference | Notes |
|---------|-----------|-------|
| **ECS Sprite Sheets** | SpriteSheetRenderer | GPU-instanced sprite animation |
| **DOTS Sprites** | NSprites | Burst-compiled sprite rendering |
| **Spine Runtime** | pixi-spine (current) | Skeleton animation with blend trees |
| **Frame-based** | sprite-animations | Simple sprite-sheet frame cycling |

### Animation State Mapping (from Spine patterns)

```
AgentState → SpineAnimation
───────────────────────────
IDLE       → "normal" / "stand"
WALKING    → "walk"
WORKING    → "sit" / "skill"
TALKING    → "touch" / "motou"
SLEEPING   → "sleep"
HAPPY      → "victory" / "dance"
```

### Recommendation

```
Current stack (PixiJS + pixi-spine) is sufficient
Add: AnimationStateMachine that maps AgentState → Spine track
Transitions: cross-fade between animations with configurable duration
```

---

## 5. Furniture Collision & Blocked-Tile Layout

### Collision Approaches

| Pattern | Reference | Use Case |
|---------|-----------|----------|
| **Grid-based** | Unity Tilemap collider | Blocked tiles = non-walkable cells |
| **AABB** | VelcroPhysics | Rectangle overlap detection |
| **SDF (Signed Distance Field)** | Discregrid, SDFGen | Smooth distance queries for pathfinding cost |
| **Batch Raycasting** | Unity-Batch-Raycasting | Optimized collision queries |

### Tile Layout Systems

| Tool | Reference | Notes |
|------|-----------|-------|
| **Tiled** | mapeditor.org | Industry-standard tile editor; exports JSON/TMX |
| **Wave Function Collapse** | DeBroglie | Procedural room generation from constraints |
| **LDtk** | LDtkToUnity | Modern 2D level editor |

### Furniture-as-Obstacle Pattern

```
Tile Map:
┌───┬───┬───┬───┬───┐
│   │ D │   │   │   │    D = Desk (blocked)
├───┼───┼───┼───┼───┤
│   │ D │   │ C │   │    C = Chair (walkable)
├───┼───┼───┼───┼───┤
│   │   │   │   │   │
└───┴───┴───┴───┴───┘

Grid Data:
- walkable: boolean[][] (from tilemap)
- occupied: Map<string, Entity> (dynamic agent positions)
- furniture: Map<string, { x, y, w, h }> (static obstacles)
```

### Recommendation

```
Collision: Grid-based blocked tile map (simplest for isometric office)
Furniture: Define furniture items with grid footprint (e.g., desk = 2x1)
Pathfinding: A* with blocked tiles + dynamic agent occupancy
Editor: Tiled JSON export → load into PixiJS tilemap
```

---

## Summary: Technology Mapping

| Game Pattern | In AnimeAgentSquad | Implementation |
|-------------|-------------------|----------------|
| A* Pathfinding | Agent movement | pixi.js + custom A* on grid |
| Context Steering | Local avoidance | Vector math, no physics deps |
| Behavior Tree / FSM | Agent task execution | TypeScript state machine |
| LLM Command Parser | Office commands→actions | NestJS endpoint → TaskService |
| Dialogue Bus | Agent chat | Socket.io /dialogue namespace |
| Spine Animation | Character rendering | pixi-spine (current) |
| Grid Collision | Furniture blocking | Tilemap + blocked[] |
| IsoSorting | Depth layering | y-sort by pivot |
