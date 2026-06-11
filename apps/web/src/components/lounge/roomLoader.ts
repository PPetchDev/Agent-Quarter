import * as PIXI from 'pixi.js';
import type { RoomObject, TiledMap } from './roomDefs';
import { parseTiledMap, FURNITURE_TILES } from './roomDefs';
import {
  proj,
  drawFurnitureByType,
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
  items: Map<number, FurnitureItem>;
  /** Redraw a single furniture item at its current position */
  updateItem: (id: number, wx: number, wy: number, wz: number) => void;
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
  return parseTiledMap(json);
}

// ─── Build interactive PixiJS scene ──────────────────────────────────────────

function createFurnitureItem(obj: RoomObject, handlers: FurnitureHandlers): FurnitureItem {
  const container = new PIXI.Container();
  const graphics = new PIXI.Graphics();
  container.addChild(graphics);

  drawFurnitureByType(graphics, obj.furnitureType, obj.wx, obj.wy, obj.wz);

  // Depth sort: screen Y of back edge (closer = higher zIndex = on top).
  // wx term breaks ties horizontally (right-over-left), wz lifts wall items.
  const fp = FURNITURE_TILES[obj.furnitureType] ?? { w: 1, d: 1 };
  const [, backY] = proj(obj.wx + fp.w / 2, obj.wy + fp.d, obj.wz);
  container.zIndex = backY + obj.wx * 4 + obj.wz * 25;

  // Hit area: floor footprint
  container.hitArea = furnitureHitPolygon(obj.furnitureType, obj.wx, obj.wy, obj.wz);
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

  tileGridGraphics.visible = false;
  furnitureLayer.sortableChildren = true;
  stage.addChild(roomBgSprite);
  stage.addChild(backgroundGraphics);
  stage.addChild(tileGridGraphics);
  stage.addChild(furnitureLayer);
  stage.addChild(activeStationGraphics);
  stage.addChild(highlightGraphics);

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
  }

  populateFurniture(objects);

  function updateItem(id: number, wx: number, wy: number, wz: number) {
    const item = items.get(id);
    if (!item) return;
    item.obj.wx = wx;
    item.obj.wy = wy;
    item.obj.wz = wz;

    item.graphics.clear();
    drawFurnitureByType(item.graphics, item.obj.furnitureType, wx, wy, wz);

    // Depth sort: screen Y of back edge (closer = higher zIndex = on top).
    // wx term breaks ties horizontally (right-over-left), wz lifts wall items.
    const fp2 = FURNITURE_TILES[item.obj.furnitureType] ?? { w: 1, d: 1 };
    const [, backY2] = proj(wx + fp2.w / 2, wy + fp2.d, wz);
    item.container.zIndex = backY2 + wx * 4 + wz * 25;
    item.container.hitArea = furnitureHitPolygon(item.obj.furnitureType, wx, wy, wz);
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
  }

  function removeItem(id: number) {
    const item = items.get(id);
    if (!item) return;
    furnitureLayer.removeChild(item.container);
    item.container.destroy({ children: true });
    items.delete(id);
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
