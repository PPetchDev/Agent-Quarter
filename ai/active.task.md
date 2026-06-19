# Active Task

C-EVENT-INTEGRATION-001 — Wire useAgentSocket into LoungeCanvas. Status: PASS (2026-06-19).

- [x] Import useAgentSocket + AgentLoungeState/AgentLoungeTaskType
- [x] Call useAgentSocket({ enabled: true }) in LoungeCanvas
- [x] useEffect monitors all 5 agent states via refs
- [x] Emit agent.state.changed, agent.task.assigned, agent.task.completed, agent.error
- [x] 313 tests PASS, tsc EXIT:0, lint EXIT:0
