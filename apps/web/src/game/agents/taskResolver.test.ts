import { describe, it, expect } from 'vitest';
import { resolveAgentTask } from '../agents/taskResolver';
import type { LoungeStationFurniture } from '../scene/loungeStations';

describe('resolveAgentTask', () => {
  it('code resolves to computerDesk', () => {
    const r = resolveAgentTask('code');
    expect(r.targetStationId).toBe('computerDesk');
    expect(r.arriveState).toBe('coding');
  });

  it('research resolves to bookshelf', () => {
    const r = resolveAgentTask('research');
    expect(r.targetStationId).toBe('bookshelf');
    expect(r.arriveState).toBe('researching');
  });

  it('meeting resolves to meetingTable', () => {
    const r = resolveAgentTask('meeting');
    expect(r.targetStationId).toBe('meetingTable');
    expect(r.arriveState).toBe('meeting');
  });

  it('document resolves to documentDesk', () => {
    const r = resolveAgentTask('document');
    expect(r.targetStationId).toBe('documentDesk');
    expect(r.arriveState).toBe('documenting');
  });

  it('review resolves to computerDesk', () => {
    const r = resolveAgentTask('review');
    expect(r.targetStationId).toBe('computerDesk');
    expect(r.arriveState).toBe('reviewing');
  });

  it('print resolves to printer', () => {
    const r = resolveAgentTask('print');
    expect(r.targetStationId).toBe('printer');
    expect(r.arriveState).toBe('printing');
  });

  it('rest resolves to sofa', () => {
    const r = resolveAgentTask('rest');
    expect(r.targetStationId).toBe('sofa');
    expect(r.arriveState).toBe('resting');
  });

  it('idle resolves to sofa', () => {
    const r = resolveAgentTask('idle');
    expect(r.targetStationId).toBe('sofa');
    expect(r.arriveState).toBe('idle');
  });

  it('walking bubble text is non-empty', () => {
    const r = resolveAgentTask('code');
    expect(r.walkingBubbleText.length).toBeGreaterThan(0);
  });

  it('arrival bubble text is non-empty', () => {
    const r = resolveAgentTask('code');
    expect(r.bubbleText.length).toBeGreaterThan(0);
  });

  it('returns a targetIsoPoint with numeric wx/wy/wz', () => {
    const r = resolveAgentTask('code');
    expect(r.targetIsoPoint).toBeDefined();
    expect(typeof r.targetIsoPoint.wx).toBe('number');
    expect(typeof r.targetIsoPoint.wy).toBe('number');
    expect(typeof r.targetIsoPoint.wz).toBe('number');
  });

  it('targetIsoPoint has positive wz (agent stands above floor)', () => {
    const r = resolveAgentTask('code');
    expect(r.targetIsoPoint.wz).toBeGreaterThan(0);
  });

  it('derives code target from the current computer desk position', () => {
    const movedFurniture: LoungeStationFurniture[] = [
      { furnitureType: 'computer_desk', wx: 1, wy: 4, wz: 0 },
    ];

    const r = resolveAgentTask('code', movedFurniture);

    expect(r.targetStationId).toBe('computerDesk');
    expect(r.targetIsoPoint).toEqual({ wx: 2.45, wy: 3.35, wz: 0.2 });
  });

  it('derives print target from the current printer position', () => {
    const movedFurniture: LoungeStationFurniture[] = [
      { furnitureType: 'printer', wx: 4, wy: 2, wz: 0 },
    ];

    const r = resolveAgentTask('print', movedFurniture);

    expect(r.targetStationId).toBe('printer');
    expect(r.targetIsoPoint).toEqual({ wx: 3.45, wy: 2.35, wz: 0.2 });
  });

  it('exposes a non-zero workDurationMs for every work task', () => {
    const workTasks = [
      'code',
      'research',
      'meeting',
      'document',
      'review',
      'print',
      'rest',
    ] as const;
    for (const task of workTasks) {
      const r = resolveAgentTask(task);
      expect(r.workDurationMs).toBeGreaterThan(0);
    }
  });

  it('idle task resolves to zero workDurationMs', () => {
    const r = resolveAgentTask('idle');
    expect(r.workDurationMs).toBe(0);
  });

  it('print is the shortest work task', () => {
    const print = resolveAgentTask('print').workDurationMs;
    const code = resolveAgentTask('code').workDurationMs;
    const rest = resolveAgentTask('rest').workDurationMs;
    expect(print).toBeLessThan(code);
    expect(print).toBeLessThan(rest);
  });

  it('exposes a non-empty doneBubbleText for every task', () => {
    const tasks = [
      'code',
      'research',
      'meeting',
      'document',
      'review',
      'print',
      'rest',
      'idle',
    ] as const;
    for (const task of tasks) {
      const r = resolveAgentTask(task);
      expect(r.doneBubbleText.length).toBeGreaterThan(0);
    }
  });

  it('done bubble text differs from arrival bubble text for work tasks', () => {
    const workTasks = [
      'code',
      'research',
      'meeting',
      'document',
      'review',
      'print',
      'rest',
    ] as const;
    for (const task of workTasks) {
      const r = resolveAgentTask(task);
      expect(r.doneBubbleText).not.toBe(r.bubbleText);
    }
  });
});
