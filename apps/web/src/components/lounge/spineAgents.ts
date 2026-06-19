import type { OfficeAgentId } from '@/game/agents/officeWorkflow';
import type { AgentState } from '@/game/agents/agentTypes';

export type SpineLoadStatus = 'loading' | 'loaded' | 'failed';

export type SpineAgentAsset = {
  agentId: OfficeAgentId;
  assetId: string;
  skel: string;
  atlas: string;
  scale: number;
  hitAreaRadius: number;
  fallbackIso: {
    wx: number;
    wy: number;
    wz: number;
  };
};

export type AgentOverlayLayout = {
  avatarSize: number;
  bubbleOffsetX: number;
  bubbleOffsetY: number;
  bubbleTransform: string;
};

export const OFFICE_AGENT_SPINE_ASSET_BY_ID: Readonly<Record<OfficeAgentId, SpineAgentAsset>> = {
  'agent-1': {
    agentId: 'agent-1',
    assetId: 'qiye',
    skel: '/azur-char/qiye/qiye_h.skel',
    atlas: '/azur-char/qiye/qiye_h.atlas',
    scale: 0.28,
    hitAreaRadius: 42,
    fallbackIso: { wx: 7.45, wy: 5.35, wz: 0.2 },
  },
  'agent-2': {
    agentId: 'agent-2',
    assetId: 'dunkeerke',
    skel: '/azur-char/dunkeerke/dunkeerke.skel',
    atlas: '/azur-char/dunkeerke/dunkeerke.atlas',
    scale: 0.28,
    hitAreaRadius: 42,
    fallbackIso: { wx: 3.45, wy: 6.25, wz: 0.2 },
  },
  'agent-3': {
    agentId: 'agent-3',
    assetId: 'fusang',
    skel: '/azur-char/fusang/fusang.skel',
    atlas: '/azur-char/fusang/fusang.atlas',
    scale: 0.28,
    hitAreaRadius: 42,
    fallbackIso: { wx: 5.45, wy: 4.2, wz: 0.2 },
  },
  'agent-4': {
    agentId: 'agent-4',
    assetId: 'kala',
    skel: '/azur-char/kala/kala.skel',
    atlas: '/azur-char/kala/kala.atlas',
    scale: 0.28,
    hitAreaRadius: 42,
    fallbackIso: { wx: 4.6, wy: 6.45, wz: 0.2 },
  },
  'agent-5': {
    agentId: 'agent-5',
    assetId: 'adiliao',
    skel: '/azur-char/adiliao/adiliao.skel',
    atlas: '/azur-char/adiliao/adiliao.atlas',
    scale: 0.28,
    hitAreaRadius: 42,
    fallbackIso: { wx: 5.45, wy: 2.0, wz: 0.2 },
  },
};

export const OFFICE_AGENT_SPINE_ASSETS: readonly SpineAgentAsset[] = Object.values(
  OFFICE_AGENT_SPINE_ASSET_BY_ID,
);

export function createInitialSpineLoadStatus(): Record<OfficeAgentId, SpineLoadStatus> {
  return OFFICE_AGENT_SPINE_ASSETS.reduce(
    (status, asset) => {
      status[asset.agentId] = 'loading';
      return status;
    },
    {} as Record<OfficeAgentId, SpineLoadStatus>,
  );
}

export function hasOfficeAgentSpineAsset(agentId: OfficeAgentId): boolean {
  return agentId in OFFICE_AGENT_SPINE_ASSET_BY_ID;
}

export function shouldShowHtmlAgentAvatar(params: {
  hasSpineAsset: boolean;
  spineStatus?: SpineLoadStatus;
}): boolean {
  if (!params.hasSpineAsset) return true;
  return params.spineStatus === 'failed';
}

export function getAgentOverlayLayout(hasSpineAsset: boolean): AgentOverlayLayout {
  if (!hasSpineAsset) {
    return {
      avatarSize: 64,
      bubbleOffsetX: 0,
      bubbleOffsetY: 72,
      bubbleTransform: 'translate(-50%, -100%)',
    };
  }

  return {
    avatarSize: 64,
    bubbleOffsetX: 46,
    bubbleOffsetY: 75,
    bubbleTransform: 'translate(0, -100%)',
  };
}

export function resolveAgentBubbleAnchor(
  position: { x: number; y: number },
  hasSpineAsset: boolean,
): { left: number; top: number; transform: string } {
  const layout = getAgentOverlayLayout(hasSpineAsset);
  return {
    left: position.x + layout.bubbleOffsetX,
    top: position.y - layout.bubbleOffsetY,
    transform: layout.bubbleTransform,
  };
}

// ── Mood Float & Glow Config ──────────────────────────────────────────────

export type MoodFloatConfig = {
  /** Float amplitude in pixels (Y-axis bobbing) */
  amplitude: number;
  /** Float period in ms (full up-down cycle) */
  periodMs: number;
  /** Alpha breath range: [min, max] */
  alphaRange: [number, number];
};

const FLOAT_AMPLITUDE: Record<AgentState, number> = {
  idle: 2,
  walking: 0,
  thinking: 4,
  coding: 4,
  researching: 4,
  meeting: 4,
  documenting: 4,
  reviewing: 4,
  printing: 4,
  resting: 1,
  done: 0,
  error: 0,
};

const FLOAT_PERIOD_MS: Record<AgentState, number> = {
  idle: 3000,
  walking: 0,
  thinking: 1500,
  coding: 1500,
  researching: 1500,
  meeting: 1500,
  documenting: 1500,
  reviewing: 1500,
  printing: 1500,
  resting: 5000,
  done: 0,
  error: 0,
};

const ALPHA_RANGE: Record<AgentState, [number, number]> = {
  idle: [0.88, 1.0],
  walking: [1.0, 1.0],
  thinking: [0.80, 1.0],
  coding: [0.80, 1.0],
  researching: [0.80, 1.0],
  meeting: [0.80, 1.0],
  documenting: [0.80, 1.0],
  reviewing: [0.80, 1.0],
  printing: [0.80, 1.0],
  resting: [0.92, 1.0],
  done: [1.0, 1.0],
  error: [1.0, 1.0],
};

export function getMoodFloatConfig(state: AgentState): MoodFloatConfig {
  return {
    amplitude: FLOAT_AMPLITUDE[state] ?? 0,
    periodMs: FLOAT_PERIOD_MS[state] ?? 0,
    alphaRange: ALPHA_RANGE[state] ?? [1.0, 1.0],
  };
}
