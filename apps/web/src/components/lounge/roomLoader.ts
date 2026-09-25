import * as PIXI from 'pixi.js';
import type { RoomObject, Rotation, TiledMap } from './roomDefs';
import { parseTiledMap, validateTiledMap, FURNITURE_TILES, footprintFor } from './roomDefs';
import { resolveFurnitureZ } from './furnitureDepth';
import {
  proj,
  drawFurnitureObject,
  drawHighlight,
  drawHighlightCollision,
  drawActiveStationHighlight,
  drawTileGrid,
  furnitureHitPolygon,
  CANVAS_W,
  CANVAS_H,
} from './pixiRoom';

export interface FurnitureHandlers {
  onSelect: (id: number) => void;
  onDragStart: (id: number, screenX: number, screenY: number) => void;
}

export interface FurnitureItem {
  id: number;
  obj: RoomObject;
  container: PIXI.Container;
  graphics: PIXI.Graphics;
}

export interface RoomScene {
  roomBgSprite: PIXI.Sprite;
  backgroundGraphics: PIXI.Graphics;
  tileGridGraphics: PIXI.Graphics;
  furnitureLayer: PIXI.Container;
  activeStationGraphics: PIXI.Graphics;
  highlightGraphics: PIXI.Graphics;
  particleGraphics: PIXI.Graphics;
  items: Map<number, FurnitureItem>;
  /** Redraw a single furniture item at its current position (and rotation, when given) */
  updateItem: (id: number, wx: number, wy: number, wz: number, rotation?: Rotation) => void;
  /** Set the selected item (draws highlight) */
  setSelected: (id: number | null) => void;
  /** Replace all furniture objects (e.g. after loading saved state) */
  rebuild: (objects: RoomObject[]) => void;
  /** Add a new furniture item to the scene */
  addItem: (obj: RoomObject) => void;
  /** Remove a furniture item from the scene */
  removeItem: (id: number) => void;
  /** Show/hide tile grid overlay */
  setEditMode: (active: boolean, cols?: number, rows?: number) => void;
  /** Draw collision (red) or normal highlight on the dragged item */
  setDragHighlight: (id: number, colliding: boolean) => void;
  /** Draw or clear the pulsing active-station floor ring */
  setActiveStation: (id: number | null, alpha: number) => void;
}

// ─── Load room JSON from URL ──────────────────────────────────────────────────

export async function loadRoomJSON(url: string): Promise<RoomObject[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load room: ${url}`);
  const json: TiledMap = await res.json();
  return loadTiledMap(json);
}

/**
 * Parse a TiledMap JSON object into RoomObject[].
 * Validates structure first, then delegates to parseTiledMap (auto-detects format).
 */
export function loadTiledMap(json: TiledMap): RoomObject[] {
  if (!validateTiledMap(json)) {
    throw new Error('Invalid Tiled map: missing tilewidth, tileheight, or layers');
  }
  return parseTiledMap(json);
}

/** Check whether a JSON object is a valid Tiled map (for drag-drop validation). */
export { validateTiledMap as isValidTiledJson } from './roomDefs';

// ─── Build interactive PixiJS scene ──────────────────────────────────────────

/**
 * Base depth key: screen Y of the back edge (closer = higher zIndex = on top), with an x
 * term to break ties right-over-left. Agents in the same layer use their feet Y, so this
 * scale must stay; resolveFurnitureZ only lifts items that must cover a neighbour.
 */
function baseDepth(obj: RoomObject): number {
  const fp = footprintFor(obj.furnitureType, obj.rotation);
  const [, backY] = proj(obj.wx + fp.w / 2, obj.wy + fp.d, obj.wz);
  return backY + obj.wx * 4 + obj.wz * 25;
}

function createFurnitureItem(obj: RoomObject, handlers: FurnitureHandlers): FurnitureItem {
  const container = new PIXI.Container();
  const graphics = new PIXI.Graphics();
  container.addChild(graphics);

  drawFurnitureObject(graphics, obj);

  // Hit area: floor footprint
  container.hitArea = furnitureHitPolygon(obj.furnitureType, obj.wx, obj.wy, obj.wz, obj.rotation);
  container.eventMode = 'static';
  container.cursor = obj.draggable ? 'pointer' : 'default';

  container.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
    e.stopPropagation();
    handlers.onSelect(obj.id);
  });

  if (obj.draggable) {
    container.on('pointerover', () => {
      container.alpha = 0.85;
    });
    container.on('pointerout', () => {
      container.alpha = 1.0;
    });
    container.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      handlers.onDragStart(obj.id, e.global.x, e.global.y);
    });
  }

  return { id: obj.id, obj: { ...obj }, container, graphics };
}

export function buildRoomScene(
  stage: PIXI.Container,
  objects: RoomObject[],
  handlers: FurnitureHandlers,
  roomBgUrl?: string,
): RoomScene {
  // Layers in draw order: room bg sprite → graphics → tile grid → furniture → active station → highlight
  const roomBgSprite = new PIXI.Sprite();
  roomBgSprite.visible = false;
  const backgroundGraphics = new PIXI.Graphics();
  const tileGridGraphics = new PIXI.Graphics();
  const furnitureLayer = new PIXI.Container();
  const activeStationGraphics = new PIXI.Graphics();
  const highlightGraphics = new PIXI.Graphics();
  const particleGraphics = new PIXI.Graphics();

  tileGridGraphics.visible = false;
  furnitureLayer.sortableChildren = true;
  stage.addChild(roomBgSprite);
  stage.addChild(backgroundGraphics);
  stage.addChild(tileGridGraphics);
  stage.addChild(furnitureLayer);
  stage.addChild(activeStationGraphics);
  stage.addChild(highlightGraphics);
  stage.addChild(particleGraphics);

  // Load Azur Lane room background if URL provided
  if (roomBgUrl) {
    PIXI.Assets.load(roomBgUrl)
      .then((texture) => {
        roomBgSprite.texture = texture;
        roomBgSprite.width = CANVAS_W;
        roomBgSprite.height = CANVAS_H;
        roomBgSprite.visible = true;
      })
      .catch(() => {
        // Fallback: keep PixiJS-drawn room
      });
  }

  // Make stage interactive so drag events propagate
  stage.eventMode = 'static';
  stage.hitArea = new PIXI.Rectangle(0, 0, CANVAS_W, CANVAS_H);

  const items = new Map<number, FurnitureItem>();

  function populateFurniture(objs: RoomObject[]) {
    // Remove only tracked furniture containers — the layer also hosts
    // non-furniture children (e.g. Spine agent displays) that must survive
    // rebuilds triggered by floor switches, room resizes, and layout resets.
    for (const item of items.values()) {
      furnitureLayer.removeChild(item.container);
      item.container.destroy({ children: true });
    }
    items.clear();
    for (const obj of objs) {
      const item = createFurnitureItem(obj, handlers);
      furnitureLayer.addChild(item.container);
      items.set(obj.id, item);
    }
    resortFurniture();
  }

  // Every move can add or remove lifts on other items, so depth is re-resolved scene-wide.
  function resortFurniture() {
    const z = resolveFurnitureZ(
      [...items.values()].map((i) => i.obj),
      baseDepth,
    );
    for (const item of items.values()) {
      item.container.zIndex = z.get(item.id) ?? baseDepth(item.obj);
    }
  }

  populateFurniture(objects);

  function updateItem(id: number, wx: number, wy: number, wz: number, rotation?: Rotation) {
    const item = items.get(id);
    if (!item) return;
    item.obj.wx = wx;
    item.obj.wy = wy;
    item.obj.wz = wz;
    if (rotation !== undefined) item.obj.rotation = rotation;

    item.graphics.clear();
    drawFurnitureObject(item.graphics, item.obj);

    item.container.hitArea = furnitureHitPolygon(item.obj.furnitureType, wx, wy, wz, item.obj.rotation);
    resortFurniture();
  }

  function setSelected(id: number | null) {
    if (id === null) {
      highlightGraphics.clear();
      return;
    }
    const item = items.get(id);
    if (!item) return;
    drawHighlight(highlightGraphics, item.obj);
  }

  function rebuild(objs: RoomObject[]) {
    populateFurniture(objs);
    highlightGraphics.clear();
    activeStationGraphics.clear();
  }

  function addItem(obj: RoomObject) {
    const item = createFurnitureItem(obj, handlers);
    furnitureLayer.addChild(item.container);
    items.set(obj.id, item);
    resortFurniture();
  }

  function removeItem(id: number) {
    const item = items.get(id);
    if (!item) return;
    furnitureLayer.removeChild(item.container);
    item.container.destroy({ children: true });
    items.delete(id);
    resortFurniture();
    highlightGraphics.clear();
    activeStationGraphics.clear();
  }

  function setEditMode(active: boolean, cols?: number, rows?: number) {
    if (active) {
      drawTileGrid(tileGridGraphics, cols, rows);
      tileGridGraphics.visible = true;
    } else {
      tileGridGraphics.visible = false;
    }
  }

  function setDragHighlight(id: number, colliding: boolean) {
    const item = items.get(id);
    if (!item) return;
    if (colliding) {
      drawHighlightCollision(highlightGraphics, item.obj);
    } else {
      drawHighlight(highlightGraphics, item.obj);
    }
  }

  function setActiveStation(id: number | null, alpha: number) {
    if (id === null) {
      activeStationGraphics.clear();
      return;
    }
    const item = items.get(id);
    if (!item) {
      activeStationGraphics.clear();
      return;
    }
    drawActiveStationHighlight(activeStationGraphics, item.obj, alpha);
  }

  return {
    roomBgSprite,
    backgroundGraphics,
    tileGridGraphics,
    furnitureLayer,
    activeStationGraphics,
    highlightGraphics,
    particleGraphics,
    items,
    updateItem,
    setSelected,
    rebuild,
    addItem,
    removeItem,
    setEditMode,
    setDragHighlight,
    setActiveStation,
  };
}
