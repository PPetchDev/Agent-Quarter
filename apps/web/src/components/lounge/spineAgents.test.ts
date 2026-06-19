import { describe, expect, it } from 'vitest';
import {
  createInitialSpineLoadStatus,
  getAgentOverlayLayout,
  getMoodFloatConfig,
  OFFICE_AGENT_SPINE_ASSET_BY_ID,
  OFFICE_AGENT_SPINE_ASSETS,
  resolveAgentBubbleAnchor,
  shouldShowHtmlAgentAvatar,
} from './spineAgents';

describe('office agent spine assets', () => {
  it('assigns one deterministic Spine asset to each visible office agent', () => {
    expect(OFFICE_AGENT_SPINE_ASSETS).toHaveLength(5);
    expect(Object.keys(OFFICE_AGENT_SPINE_ASSET_BY_ID)).toEqual([
      'agent-1',
      'agent-2',
      'agent-3',
      'agent-4',
      'agent-5',
    ]);
    expect(OFFICE_AGENT_SPINE_ASSETS.map((asset) => asset.assetId)).toEqual([
      'qiye',
      'dunkeerke',
      'fusang',
      'kala',
      'adiliao',
    ]);
  });

  it('points every mapped asset at public Spine skeleton and atlas files', () => {
    for (const asset of OFFICE_AGENT_SPINE_ASSETS) {
      expect(asset.skel).toMatch(/^\/azur-char\/.+\.skel$/);
      expect(asset.atlas).toMatch(/^\/azur-char\/.+\.atlas$/);
      expect(asset.scale).toBeGreaterThan(0);
      expect(asset.hitAreaRadius).toBeGreaterThan(0);
      expect(asset.fallbackIso.wz).toBeGreaterThanOrEqual(0);
    }
  });

  it('starts mapped agents in loading state until Pixi confirms success or failure', () => {
    expect(createInitialSpineLoadStatus()).toEqual({
      'agent-1': 'loading',
      'agent-2': 'loading',
      'agent-3': 'loading',
      'agent-4': 'loading',
      'agent-5': 'loading',
    });
  });

  it('uses HTML avatar only when a mapped Spine asset fails', () => {
    expect(shouldShowHtmlAgentAvatar({ hasSpineAsset: true, spineStatus: 'loading' })).toBe(false);
    expect(shouldShowHtmlAgentAvatar({ hasSpineAsset: true, spineStatus: 'loaded' })).toBe(false);
    expect(shouldShowHtmlAgentAvatar({ hasSpineAsset: true, spineStatus: 'failed' })).toBe(true);
    expect(shouldShowHtmlAgentAvatar({ hasSpineAsset: false })).toBe(true);
  });

  it('moves bubbles beside Spine bodies instead of over the character art', () => {
    expect(getAgentOverlayLayout(true)).toMatchObject({
      bubbleOffsetX: 46,
      bubbleOffsetY: 112,
      bubbleTransform: 'translate(0, -100%)',
    });
    expect(getAgentOverlayLayout(false)).toMatchObject({
      bubbleOffsetX: 0,
      bubbleOffsetY: 72,
      bubbleTransform: 'translate(-50%, -100%)',
    });
  });

  it('resolves bubble position from the same agent anchor used for the Spine body', () => {
    expect(resolveAgentBubbleAnchor({ x: 200, y: 300 }, true)).toEqual({
      left: 246,
      top: 188,
      transform: 'translate(0, -100%)',
    });
    expect(resolveAgentBubbleAnchor({ x: 200, y: 300 }, false)).toEqual({
      left: 200,
      top: 228,
      transform: 'translate(-50%, -100%)',
    });
  });
});

describe('mood float config', () => {
  it('returns zero amplitude and period for walking state', () => {
    const config = getMoodFloatConfig('walking');
    expect(config.amplitude).toBe(0);
    expect(config.periodMs).toBe(0);
    expect(config.alphaRange).toEqual([1.0, 1.0]);
  });

  it('returns zero amplitude for error and done states', () => {
    for (const state of ['error', 'done'] as const) {
      expect(getMoodFloatConfig(state).amplitude).toBe(0);
    }
  });

  it('returns idle float: amplitude=2, period=3000ms, alpha=[0.88,1.0]', () => {
    const config = getMoodFloatConfig('idle');
    expect(config.amplitude).toBe(2);
    expect(config.periodMs).toBe(3000);
    expect(config.alphaRange).toEqual([0.88, 1.0]);
  });

  it('returns working float: amplitude=4, period=1500ms, alpha=[0.80,1.0]', () => {
    for (const state of ['coding', 'thinking', 'researching', 'meeting', 'documenting', 'reviewing', 'printing'] as const) {
      const config = getMoodFloatConfig(state);
      expect(config.amplitude).toBe(4);
      expect(config.periodMs).toBe(1500);
      expect(config.alphaRange).toEqual([0.80, 1.0]);
    }
  });

  it('returns resting float: amplitude=1, period=5000ms, alpha=[0.92,1.0]', () => {
    const config = getMoodFloatConfig('resting');
    expect(config.amplitude).toBe(1);
    expect(config.periodMs).toBe(5000);
    expect(config.alphaRange).toEqual([0.92, 1.0]);
  });

  it('returns config for all 12 AgentStates', () => {
    const states = ['idle', 'walking', 'thinking', 'coding', 'researching', 'meeting', 'documenting', 'reviewing', 'printing', 'resting', 'done', 'error'];
    for (const state of states) {
      const config = getMoodFloatConfig(state as any);
      expect(config).toBeDefined();
      expect(typeof config.amplitude).toBe('number');
      expect(typeof config.periodMs).toBe('number');
      expect(Array.isArray(config.alphaRange)).toBe(true);
      expect(config.alphaRange).toHaveLength(2);
    }
  });
});
