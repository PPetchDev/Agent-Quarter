import type { OfficeAgentId } from '@/game/agents/officeWorkflow';

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
    bubbleOffsetY: 112,
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
