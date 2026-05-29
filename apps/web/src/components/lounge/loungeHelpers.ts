import type { RoomObject } from './roomDefs';
import { checkCollision, FURNITURE_TILES } from './roomDefs';
import { ROOM_TILES_X, ROOM_TILES_Y } from './pixiRoom';

// ─── Layout Helpers ───────────────────────────────────────────────────────────

export function snapObj(
  o: RoomObject,
  maxX = ROOM_TILES_X,
  maxY = ROOM_TILES_Y,
): RoomObject {
  return {
    ...o,
    wx: Math.round(Math.max(0, Math.min(maxX - 1, o.wx))),
    wy: Math.min(maxY, Math.round(Math.max(0, o.wy))),
  };
}

export function cloneLayout(objects: RoomObject[]): RoomObject[] {
  return objects.map((o) => ({ ...o }));
}

export function autoArrangeLayout(
  objects: RoomObject[],
  maxW: number,
  maxH: number,
): RoomObject[] | null {
  const sorted = [...objects].sort((a, b) => {
    const ta = FURNITURE_TILES[a.furnitureType] ?? { w: 1, d: 1 };
    const tb = FURNITURE_TILES[b.furnitureType] ?? { w: 1, d: 1 };
    return tb.w * tb.d - ta.w * ta.d;
  });

  const placed: RoomObject[] = [];
  const positions = new Map<number, { wx: number; wy: number }>();

  for (const current of sorted) {
    const fp = FURNITURE_TILES[current.furnitureType] ?? { w: 1, d: 1 };
    const maxX = Math.max(0, maxW - fp.w);
    const maxY = Math.max(0, maxH - fp.d);
    let found = false;

    for (let y = 0; y <= maxY && !found; y++) {
      for (let x = 0; x <= maxX; x++) {
        const candidate = { ...current, wx: x, wy: y };
        if (!checkCollision([...placed, candidate], candidate.id, x, y)) {
          placed.push(candidate);
          positions.set(current.id, { wx: x, wy: y });
          found = true;
          break;
        }
      }
    }

    if (!found) return null;
  }

  return objects.map((obj) => {
    const pos = positions.get(obj.id);
    if (!pos) return { ...obj };
    return { ...obj, wx: pos.wx, wy: pos.wy };
  });
}

// ─── Share Helpers ────────────────────────────────────────────────────────────

export type SharedLayoutPayload = {
  v: 1;
  roomName: string;
  roomW: number;
  roomH: number;
  happiness: number;
  coins: number;
  floor: number;
  objects: RoomObject[];
};

function encodeBase64Url(input: string): string {
  if (typeof window === 'undefined') return '';
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(input: string): string | null {
  if (typeof window === 'undefined') return null;
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function encodeShareUrl(payload: SharedLayoutPayload): string | null {
  if (typeof window === 'undefined') return null;
  const encoded = encodeBase64Url(JSON.stringify(payload));
  if (!encoded) return null;
  return `${window.location.origin}${window.location.pathname}?layout=${encoded}`;
}

export function parseSharedLayoutFromUrl(): SharedLayoutPayload | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('layout');
  if (!encoded) return null;

  const decoded = decodeBase64Url(encoded);
  if (!decoded) return null;

  try {
    const parsed = JSON.parse(decoded) as Partial<SharedLayoutPayload>;
    if (parsed.v !== 1 || !Array.isArray(parsed.objects)) return null;

    const roomW =
      typeof parsed.roomW === 'number'
        ? Math.max(6, Math.min(16, parsed.roomW))
        : ROOM_TILES_X;
    const roomH =
      typeof parsed.roomH === 'number'
        ? Math.max(5, Math.min(14, parsed.roomH))
        : ROOM_TILES_Y;

    const objects = parsed.objects
      .filter((o): o is RoomObject => {
        return (
          typeof o?.id === 'number' &&
          typeof o?.furnitureType === 'string' &&
          typeof o?.label === 'string' &&
          typeof o?.description === 'string' &&
          typeof o?.wx === 'number' &&
          typeof o?.wy === 'number' &&
          typeof o?.wz === 'number' &&
          typeof o?.happiness === 'number' &&
          typeof o?.draggable === 'boolean'
        );
      })
      .map((o) => snapObj(o, roomW, roomH));

    if (objects.length === 0) return null;

    return {
      v: 1,
      roomName:
        typeof parsed.roomName === 'string' && parsed.roomName.trim().length > 0
          ? parsed.roomName
          : 'Shared Lounge',
      roomW,
      roomH,
      happiness: typeof parsed.happiness === 'number' ? parsed.happiness : 128,
      coins:
        typeof parsed.coins === 'number'
          ? Math.max(0, parsed.coins)
          : 500,
      floor: parsed.floor === 2 ? 2 : 1,
      objects,
    };
  } catch {
    return null;
  }
}

export function removeSharedLayoutQuery(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('layout')) return;
  url.searchParams.delete('layout');
  const qs = url.searchParams.toString();
  const next = `${url.pathname}${qs ? `?${qs}` : ''}${url.hash}`;
  window.history.replaceState({}, '', next);
}
