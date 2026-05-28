'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import type { Agent, AgentTaskType, AgentState } from '@/game/agents/agentTypes';
import type { IsoWorldPoint, Position } from '@/game/agents/agentTypes';
import { resolveAgentTask } from '@/game/agents/taskResolver';
import { moveTowardsTarget } from '@/game/movement/moveToTarget';
import { planLoungeGridRoute } from '@/game/scene/loungePathGrid';
import type { GridCell, IsoRoutePoint } from '@/game/movement/gridPath';
import { resolveWalkingAnimation, resolveStateAnimation } from '@/game/animation/animationResolver';
import { enqueueTask as enqueueTaskPure, dequeueTask } from '@/game/agents/taskQueue';
import type { RoomObject } from '@/components/lounge/roomDefs';
import {
  computeRoomProjection,
  ROOM_TILES_X,
  ROOM_TILES_Y,
} from '@/components/lounge/pixiRoom';

const DEFAULT_START_ISO = { wx: 3.0, wy: 0.65, wz: 0.2 };
const EMPTY_ROOM_OBJECTS: RoomObject[] = [];

type UseAgentWalkOptions = {
  roomObjects?: RoomObject[];
  roomWidth?: number;
  roomHeight?: number;
};

export type AgentRouteDebugPoint = {
  iso: IsoWorldPoint;
  position: Position;
  cell: GridCell;
};

type RouteWaypoint = AgentRouteDebugPoint;

export type AgentRouteDebug = {
  points: AgentRouteDebugPoint[];
  activeIndex: number;
};

function projectDefaultStart(): { x: number; y: number } {
  const { S, OX, OY } = computeRoomProjection(ROOM_TILES_X, ROOM_TILES_Y);
  return {
    x: OX + DEFAULT_START_ISO.wx * S + DEFAULT_START_ISO.wy * S * 0.65,
    y: OY - DEFAULT_START_ISO.wy * S * 0.65 - DEFAULT_START_ISO.wz * S,
  };
}

// Default position: open floor between the meeting table and rest zone.
const DEFAULT_AGENT_POSITION = projectDefaultStart();
const DEFAULT_AGENT: Agent = {
  id:          'agent-1',
  name:        'Mai',
  characterId: 'mai',
  state:       'idle',
  position:    DEFAULT_AGENT_POSITION,
  direction:   'down',
  animation:   'idle',
  bubbleText:  undefined,
  speed:       110, // pixels per second
  taskQueue:   [],
};

function projectIsoPoint(
  point: IsoWorldPoint,
  roomWidth: number,
  roomHeight: number,
): Position {
  const { S, OX, OY } = computeRoomProjection(roomWidth, roomHeight);
  return {
    x: OX + point.wx * S + point.wy * S * 0.65,
    y: OY - point.wy * S * 0.65 - point.wz * S,
  };
}

function buildWaypoints(
  route: IsoRoutePoint[],
  roomWidth: number,
  roomHeight: number,
): RouteWaypoint[] {
  return route.map((point) => ({
    iso: {
      wx: point.wx,
      wy: point.wy,
      wz: point.wz,
    },
    position: projectIsoPoint(point, roomWidth, roomHeight),
    cell: point.cell,
  }));
}

function distance(a: Position, b: Position): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function interpolateIso(a: IsoWorldPoint, b: IsoWorldPoint, t: number): IsoWorldPoint {
  return {
    wx: a.wx + (b.wx - a.wx) * t,
    wy: a.wy + (b.wy - a.wy) * t,
    wz: a.wz + (b.wz - a.wz) * t,
  };
}

export function useAgentWalk(options: UseAgentWalkOptions = {}, agentId = 'agent-1') {
  const {
    roomObjects = EMPTY_ROOM_OBJECTS,
    roomWidth = ROOM_TILES_X,
    roomHeight = ROOM_TILES_Y,
  } = options;
  const [agent, setAgent] = useState<Agent>(DEFAULT_AGENT);
  const [routeDebug, setRouteDebug] = useState<AgentRouteDebug>({
    points: [],
    activeIndex: 0,
  });

  // Use refs so RAF callback always sees latest values without stale closures
  const agentRef    = useRef<Agent>(DEFAULT_AGENT);
  const rafRef      = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const currentIsoRef = useRef<IsoWorldPoint>(DEFAULT_START_ISO);
  const segmentStartIsoRef = useRef<IsoWorldPoint>(DEFAULT_START_ISO);
  const segmentStartPositionRef = useRef<Position>(DEFAULT_AGENT_POSITION);
  const routeRef = useRef<RouteWaypoint[]>([]);
  const routeIndexRef = useRef(0);
  const routeDebugRef = useRef<AgentRouteDebug>({ points: [], activeIndex: 0 });

  const updateAgent = useCallback((updater: (prev: Agent) => Agent) => {
    setAgent((prev) => {
      const next = updater(prev);
      agentRef.current = next;
      return next;
    });
  }, []);

  const updateRouteDebug = useCallback((points: RouteWaypoint[], activeIndex: number) => {
    const next = { points, activeIndex };
    routeDebugRef.current = next;
    setRouteDebug(next);
  }, []);

  const clearRoute = useCallback(() => {
    routeRef.current = [];
    routeIndexRef.current = 0;
    updateRouteDebug([], 0);
  }, [updateRouteDebug]);

  const failBlockedRoute = useCallback((params: {
    taskType?: AgentTaskType;
    targetStationId?: string;
  }) => {
    clearRoute();
    updateAgent((prev) => ({
      ...prev,
      state: 'error',
      taskType: params.taskType ?? prev.taskType,
      targetPosition: undefined,
      targetStationId: params.targetStationId ?? prev.targetStationId,
      arriveState: undefined,
      arriveBubbleText: undefined,
      bubbleText: 'Path is blocked.',
      animation: resolveStateAnimation('error'),
      workDurationMs: undefined,
      workElapsedMs: undefined,
    }));
  }, [clearRoute, updateAgent]);

  const assignTask = useCallback((taskType: AgentTaskType) => {
    const resolved = resolveAgentTask(taskType, roomObjects);
    const route = planLoungeGridRoute({
      objects: roomObjects,
      roomWidth,
      roomHeight,
      start: currentIsoRef.current,
      target: resolved.targetIsoPoint,
    });

    if (!route || route.length === 0) {
      failBlockedRoute({
        taskType,
        targetStationId: resolved.targetStationId,
      });
      return;
    }

    const waypoints = buildWaypoints(route, roomWidth, roomHeight);
    routeRef.current = waypoints;
    routeIndexRef.current = 0;
    segmentStartIsoRef.current = currentIsoRef.current;
    segmentStartPositionRef.current = agentRef.current.position;
    updateRouteDebug(waypoints, 0);
    const targetPosition = waypoints[0]!.position;

    updateAgent((prev) => ({
      ...prev,
      state:           'walking',
      taskType,
      targetPosition,
      targetStationId: resolved.targetStationId,
      arriveState:     resolved.arriveState,
      arriveBubbleText: resolved.bubbleText,
      bubbleText:      resolved.walkingBubbleText,
      animation:       resolveWalkingAnimation(prev.direction),
      workDurationMs:  resolved.workDurationMs > 0 ? resolved.workDurationMs : undefined,
      workElapsedMs:   undefined,
    }));
  }, [failBlockedRoute, roomHeight, roomObjects, roomWidth, updateAgent, updateRouteDebug]);

  useEffect(() => {
    const current = agentRef.current;
    if (current.state !== 'walking' || !current.taskType || !current.targetPosition) return;

    const resolved = resolveAgentTask(current.taskType, roomObjects);
    const route = planLoungeGridRoute({
      objects: roomObjects,
      roomWidth,
      roomHeight,
      start: currentIsoRef.current,
      target: resolved.targetIsoPoint,
    });

    if (!route || route.length === 0) {
      failBlockedRoute({
        taskType: current.taskType,
        targetStationId: resolved.targetStationId,
      });
      return;
    }

    const waypoints = buildWaypoints(route, roomWidth, roomHeight);
    routeRef.current = waypoints;
    routeIndexRef.current = 0;
    segmentStartIsoRef.current = currentIsoRef.current;
    segmentStartPositionRef.current = current.position;
    updateRouteDebug(waypoints, 0);

    updateAgent((prev) => ({
      ...prev,
      targetPosition: waypoints[0]!.position,
      targetStationId: resolved.targetStationId,
      arriveState: resolved.arriveState,
      arriveBubbleText: resolved.bubbleText,
      bubbleText: resolved.walkingBubbleText,
      workDurationMs: resolved.workDurationMs > 0 ? resolved.workDurationMs : undefined,
      workElapsedMs: undefined,
    }));
  }, [
    failBlockedRoute,
    roomHeight,
    roomObjects,
    roomWidth,
    updateAgent,
    updateRouteDebug,
  ]);

  const tickAgent = useCallback((deltaTime: number) => {
    const current = agentRef.current;
    if (!current.targetPosition) return;

    const result = moveTowardsTarget({
      current:  current.position,
      target:   current.targetPosition,
      speed:    current.speed,
      deltaTime,
    });

    if (result.arrived) {
      const route = routeRef.current;
      const arrivedIndex = routeIndexRef.current;
      const arrivedWaypoint = route[arrivedIndex];

      if (arrivedWaypoint) {
        currentIsoRef.current = arrivedWaypoint.iso;
      }

      if (arrivedIndex < route.length - 1) {
        const nextIndex = arrivedIndex + 1;
        routeIndexRef.current = nextIndex;
        updateRouteDebug(route, nextIndex);
        const nextWaypoint = route[nextIndex]!;
        const walkAnim = resolveWalkingAnimation(result.direction);
        segmentStartIsoRef.current = arrivedWaypoint?.iso ?? currentIsoRef.current;
        segmentStartPositionRef.current = result.position;

        updateAgent((prev) => ({
          ...prev,
          position: result.position,
          direction: result.direction,
          targetPosition: nextWaypoint.position,
          animation: walkAnim,
        }));
        return;
      }

      clearRoute();

      const arrivedState   = current.arriveState ?? 'idle';
      const arrivedBubble  = current.arriveBubbleText;
      const arrivedAnim    = resolveStateAnimation(arrivedState);
      const startsWork     = (current.workDurationMs ?? 0) > 0;

      updateAgent((prev) => ({
        ...prev,
        position:        result.position,
        direction:       result.direction,
        state:           arrivedState,
        animation:       arrivedAnim,
        bubbleText:      arrivedBubble,
        targetPosition:  undefined,
        targetStationId: prev.targetStationId,
        arriveState:     undefined,
        arriveBubbleText: undefined,
        workDurationMs:  startsWork ? prev.workDurationMs : undefined,
        workElapsedMs:   startsWork ? 0 : undefined,
      }));
    } else {
      const walkAnim = resolveWalkingAnimation(result.direction);
      const route = routeRef.current;
      const currentWaypoint = route[routeIndexRef.current];
      if (currentWaypoint) {
        const startPosition = segmentStartPositionRef.current;
        const segmentDistance = distance(startPosition, currentWaypoint.position);
        const progress = segmentDistance > 0
          ? Math.max(0, Math.min(1, distance(startPosition, result.position) / segmentDistance))
          : 1;
        currentIsoRef.current = interpolateIso(
          segmentStartIsoRef.current,
          currentWaypoint.iso,
          progress,
        );
      }
      updateAgent((prev) => ({
        ...prev,
        position:  result.position,
        direction: result.direction,
        animation: walkAnim,
      }));
    }
  }, [clearRoute, updateAgent, updateRouteDebug]);

  const tickWork = useCallback((deltaSeconds: number) => {
    const current = agentRef.current;
    if (
      current.workDurationMs === undefined ||
      current.workElapsedMs === undefined
    ) {
      return;
    }
    const next = current.workElapsedMs + deltaSeconds * 1000;
    if (next >= current.workDurationMs) {
      const { next: nextTask, rest } = dequeueTask(current.taskQueue);
      if (nextTask) {
        updateAgent((prev) => ({
          ...prev,
          taskQueue:       rest,
          workDurationMs:  undefined,
          workElapsedMs:   undefined,
        }));
        assignTask(nextTask);
      } else {
        updateAgent((prev) => ({
          ...prev,
          state:           'idle',
          taskType:        'idle',
          animation:       resolveStateAnimation('idle'),
          bubbleText:      'Done. Idle.',
          targetStationId: undefined,
          arriveState:     undefined,
          arriveBubbleText: undefined,
          workDurationMs:  undefined,
          workElapsedMs:   undefined,
        }));
      }
    } else {
      updateAgent((prev) => ({
        ...prev,
        workElapsedMs: next,
      }));
    }
  }, [assignTask, updateAgent]);

  // RAF game loop
  useEffect(() => {
    let animId: number;

    const loop = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const rawDelta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      // Clamp to avoid huge jumps after tab blur
      const delta = Math.min(rawDelta, 0.05);

      const a = agentRef.current;
      if (a.targetPosition) {
        tickAgent(delta);
      } else if (
        a.workDurationMs !== undefined &&
        a.workElapsedMs !== undefined &&
        a.workElapsedMs < a.workDurationMs
      ) {
        tickWork(delta);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    rafRef.current = animId;

    return () => {
      cancelAnimationFrame(animId);
      lastTimeRef.current = 0;
    };
  }, [tickAgent, tickWork]);

  const setAgentState = useCallback((state: AgentState) => {
    updateAgent((prev) => ({
      ...prev,
      state,
      animation: resolveStateAnimation(state),
    }));
  }, [updateAgent]);

  const clearAgentTask = useCallback(() => {
    clearRoute();
    updateAgent((prev) => ({
      ...prev,
      taskType:        undefined,
      targetPosition:  undefined,
      targetStationId: undefined,
      arriveState:     undefined,
      arriveBubbleText: undefined,
      state:           'idle',
      animation:       'idle',
      bubbleText:      undefined,
      workDurationMs:  undefined,
      workElapsedMs:   undefined,
      taskQueue:       [],
    }));
  }, [clearRoute, updateAgent]);

  const enqueueTask = useCallback((task: AgentTaskType) => {
    updateAgent((prev) => ({
      ...prev,
      taskQueue: enqueueTaskPure(prev.taskQueue, task),
    }));
  }, [updateAgent]);

  const clearQueue = useCallback(() => {
    updateAgent((prev) => ({ ...prev, taskQueue: [] }));
  }, [updateAgent]);

  return { agent, assignTask, setAgentState, clearAgentTask, enqueueTask, clearQueue, routeDebug };
}
