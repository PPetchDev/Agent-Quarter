'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import type { Agent, AgentTaskType, AgentState } from '@/game/agents/agentTypes';
import type { IsoWorldPoint, Position } from '@/game/agents/agentTypes';
import { resolveAgentTask } from '@/game/agents/taskResolver';
import { moveTowardsTarget } from '@/game/movement/moveToTarget';
import { planLoungeGridRoute, type LoungeRouteGrid } from '@/game/scene/loungePathGrid';
import type { GridCell, IsoRoutePoint } from '@/game/movement/gridPath';
import { resolveWalkingAnimation, resolveStateAnimation } from '@/game/animation/animationResolver';
import { resolveDirection } from '@/game/movement/direction';
import {
  enqueueTask as enqueueTaskPure,
  dequeueTask,
  MAX_TASK_QUEUE_LENGTH,
} from '@/game/agents/taskQueue';
import { resolveLoungeStation, type LoungeStationId } from '@/game/scene/loungeStations';
import type { RoomObject } from '@/components/lounge/roomDefs';
import {
  computeRoomProjection,
  projAt,
  ROOM_TILES_X,
  ROOM_TILES_Y,
} from '@/components/lounge/pixiRoom';

const DEFAULT_START_ISO = { wx: 3.0, wy: 0.65, wz: 0.2 };
const EMPTY_ROOM_OBJECTS: RoomObject[] = [];
const WORK_PUBLISH_INTERVAL_MS = 50;

type UseAgentWalkOptions = {
  roomObjects?: RoomObject[];
  roomWidth?: number;
  roomHeight?: number;
  /** Override the agent's task queue cap. Defaults to `MAX_TASK_QUEUE_LENGTH`. */
  maxQueueLength?: number;
  /** Agent identity overrides. Defaults represent the original solo agent "Mai". */
  agentId?: string;
  agentName?: string;
  characterId?: string;
  /** Initial iso world position. Defaults to `DEFAULT_START_ISO`. */
  startIso?: IsoWorldPoint;
  /** Shared blocked-cell grid for the current room layout. */
  routeGrid?: LoungeRouteGrid;
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

function projectIsoToScreen(point: IsoWorldPoint, S: number, OX: number, OY: number): Position {
  const [x, y] = projAt(point.wx, point.wy, point.wz, S, OX, OY);
  return { x, y };
}

function buildWaypoints(
  route: IsoRoutePoint[],
  roomWidth: number,
  roomHeight: number,
): RouteWaypoint[] {
  const { S, OX, OY } = computeRoomProjection(roomWidth, roomHeight);
  return route.map((point) => ({
    iso: { wx: point.wx, wy: point.wy, wz: point.wz },
    position: projectIsoToScreen(point, S, OX, OY),
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

export function useAgentWalk(options: UseAgentWalkOptions = {}, _legacyAgentId = 'agent-1') {
  const {
    roomObjects = EMPTY_ROOM_OBJECTS,
    roomWidth = ROOM_TILES_X,
    roomHeight = ROOM_TILES_Y,
    maxQueueLength = MAX_TASK_QUEUE_LENGTH,
    agentId = 'agent-1',
    agentName = 'Mai',
    characterId = 'mai',
    startIso = DEFAULT_START_ISO,
    routeGrid,
  } = options;
  void _legacyAgentId;
  const [agent, setAgent] = useState<Agent>(() => ({
    id: agentId,
    name: agentName,
    characterId,
    state: 'idle',
    position: (() => {
      const { S, OX, OY } = computeRoomProjection(ROOM_TILES_X, ROOM_TILES_Y);
      const [x, y] = projAt(startIso.wx, startIso.wy, startIso.wz, S, OX, OY);
      return { x, y };
    })(),
    direction: 'down',
    animation: 'idle',
    bubbleText: undefined,
    speed: 110,
    taskQueue: [],
  }));
  const [routeDebug, setRouteDebug] = useState<AgentRouteDebug>({
    points: [],
    activeIndex: 0,
  });

  // Use refs so RAF callback always sees latest values without stale closures
  const agentRef = useRef<Agent>(agent);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const currentIsoRef = useRef<IsoWorldPoint>(startIso);
  const segmentStartIsoRef = useRef<IsoWorldPoint>(startIso);
  const segmentStartPositionRef = useRef<Position>(agent.position);
  const routeRef = useRef<RouteWaypoint[]>([]);
  const routeIndexRef = useRef(0);
  const routeDebugRef = useRef<AgentRouteDebug>({ points: [], activeIndex: 0 });
  // Work timer ticks every RAF frame in a ref so the auto-pop transition is
  // precise. `agent.workElapsedMs` (React state) only re-publishes at most
  // every WORK_PUBLISH_INTERVAL_MS — enough for a smooth progress bar without
  // a 60 Hz re-render storm.
  const workElapsedMsRef = useRef(0);
  const lastWorkPublishRef = useRef(0);

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

  const failBlockedRoute = useCallback(
    (params: { taskType?: AgentTaskType; targetStationId?: string }) => {
      clearRoute();
      workElapsedMsRef.current = 0;
      lastWorkPublishRef.current = 0;
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
    },
    [clearRoute, updateAgent],
  );

  const assignTask = useCallback(
    (taskType: AgentTaskType) => {
      const resolved = resolveAgentTask(taskType, roomObjects);
      const route = planLoungeGridRoute({
        objects: roomObjects,
        routeGrid,
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
        state: 'walking',
        taskType,
        targetPosition,
        targetStationId: resolved.targetStationId,
        arriveState: resolved.arriveState,
        arriveBubbleText: resolved.bubbleText,
        bubbleText: resolved.walkingBubbleText,
        animation: resolveWalkingAnimation(prev.direction),
        workDurationMs: resolved.workDurationMs > 0 ? resolved.workDurationMs : undefined,
        workElapsedMs: undefined,
      }));
    },
    [failBlockedRoute, roomHeight, roomObjects, roomWidth, routeGrid, updateAgent, updateRouteDebug],
  );

  useEffect(() => {
    const current = agentRef.current;
    if (current.state !== 'walking' || !current.taskType || !current.targetPosition) return;

    const resolved = resolveAgentTask(current.taskType, roomObjects);
    const route = planLoungeGridRoute({
      objects: roomObjects,
      routeGrid,
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
  }, [failBlockedRoute, roomHeight, roomObjects, roomWidth, routeGrid, updateAgent, updateRouteDebug]);

  const tickAgent = useCallback(
    (deltaTime: number) => {
      const current = agentRef.current;
      if (!current.targetPosition) return;

      const result = moveTowardsTarget({
        current: current.position,
        target: current.targetPosition,
        speed: current.speed,
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

        const arrivedState = current.arriveState ?? 'idle';
        const arrivedBubble = current.arriveBubbleText;
        const arrivedAnim = resolveStateAnimation(arrivedState);
        const startsWork = (current.workDurationMs ?? 0) > 0;

        // Face the station body. Project station iso → screen, snap to dominant axis.
        let arriveDirection = result.direction;
        if (current.targetStationId) {
          const station = resolveLoungeStation(
            current.targetStationId as LoungeStationId,
            roomObjects,
          );
          const { S, OX, OY } = computeRoomProjection(roomWidth, roomHeight);
          const stationScreen = projectIsoToScreen(
            {
              wx: station.isoPosition.x,
              wy: station.isoPosition.y,
              wz: station.isoPosition.z ?? 0,
            },
            S,
            OX,
            OY,
          );
          const dx = stationScreen.x - result.position.x;
          const dy = stationScreen.y - result.position.y;
          if (dx !== 0 || dy !== 0) {
            arriveDirection = resolveDirection(dx, dy);
          }
        }

        workElapsedMsRef.current = 0;
        lastWorkPublishRef.current = performance.now();
        updateAgent((prev) => ({
          ...prev,
          position: result.position,
          direction: arriveDirection,
          state: arrivedState,
          animation: arrivedAnim,
          bubbleText: arrivedBubble,
          targetPosition: undefined,
          targetStationId: prev.targetStationId,
          arriveState: undefined,
          arriveBubbleText: undefined,
          workDurationMs: startsWork ? prev.workDurationMs : undefined,
          workElapsedMs: startsWork ? 0 : undefined,
        }));
      } else {
        const walkAnim = resolveWalkingAnimation(result.direction);
        const route = routeRef.current;
        const currentWaypoint = route[routeIndexRef.current];
        if (currentWaypoint) {
          const startPosition = segmentStartPositionRef.current;
          const segmentDistance = distance(startPosition, currentWaypoint.position);
          const progress =
            segmentDistance > 0
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
          position: result.position,
          direction: result.direction,
          animation: walkAnim,
        }));
      }
    },
    [clearRoute, roomHeight, roomObjects, roomWidth, updateAgent, updateRouteDebug],
  );

  const tickWork = useCallback(
    (deltaSeconds: number) => {
      const current = agentRef.current;
      if (current.workDurationMs === undefined) return;

      workElapsedMsRef.current += deltaSeconds * 1000;

      if (workElapsedMsRef.current >= current.workDurationMs) {
        workElapsedMsRef.current = 0;
        lastWorkPublishRef.current = 0;
        const { next: nextTask, rest } = dequeueTask(current.taskQueue);
        if (nextTask) {
          updateAgent((prev) => ({
            ...prev,
            taskQueue: rest,
            workDurationMs: undefined,
            workElapsedMs: undefined,
          }));
          assignTask(nextTask);
        } else {
          const doneBubble = current.taskType
            ? resolveAgentTask(current.taskType, roomObjects).doneBubbleText
            : 'Idle.';
          updateAgent((prev) => ({
            ...prev,
            state: 'idle',
            taskType: 'idle',
            animation: resolveStateAnimation('idle'),
            bubbleText: doneBubble,
            targetStationId: undefined,
            arriveState: undefined,
            arriveBubbleText: undefined,
            workDurationMs: undefined,
            workElapsedMs: undefined,
          }));
        }
        return;
      }

      // Throttle React state publishes for the progress bar.
      const now = performance.now();
      if (now - lastWorkPublishRef.current >= WORK_PUBLISH_INTERVAL_MS) {
        lastWorkPublishRef.current = now;
        const published = workElapsedMsRef.current;
        updateAgent((prev) => ({ ...prev, workElapsedMs: published }));
      }
    },
    [assignTask, roomObjects, updateAgent],
  );

  const agentLoopActive = Boolean(agent.targetPosition) || agent.workDurationMs !== undefined;

  // RAF game loop. Keep it asleep while idle; /lounge mounts one hook per visible agent.
  useEffect(() => {
    if (!agentLoopActive) return;

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
      } else if (a.workDurationMs !== undefined) {
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
  }, [agentLoopActive, tickAgent, tickWork]);

  const setAgentState = useCallback(
    (state: AgentState) => {
      updateAgent((prev) => ({
        ...prev,
        state,
        animation: resolveStateAnimation(state),
      }));
    },
    [updateAgent],
  );

  const clearAgentTask = useCallback(() => {
    clearRoute();
    workElapsedMsRef.current = 0;
    lastWorkPublishRef.current = 0;
    updateAgent((prev) => ({
      ...prev,
      taskType: undefined,
      targetPosition: undefined,
      targetStationId: undefined,
      arriveState: undefined,
      arriveBubbleText: undefined,
      state: 'idle',
      animation: 'idle',
      bubbleText: undefined,
      workDurationMs: undefined,
      workElapsedMs: undefined,
      taskQueue: [],
    }));
  }, [clearRoute, updateAgent]);

  const enqueueTask = useCallback(
    (task: AgentTaskType) => {
      updateAgent((prev) => ({
        ...prev,
        taskQueue: enqueueTaskPure(prev.taskQueue, task, maxQueueLength),
      }));
    },
    [maxQueueLength, updateAgent],
  );

  const clearQueue = useCallback(() => {
    updateAgent((prev) => ({ ...prev, taskQueue: [] }));
  }, [updateAgent]);

  return { agent, assignTask, setAgentState, clearAgentTask, enqueueTask, clearQueue, routeDebug };
}
