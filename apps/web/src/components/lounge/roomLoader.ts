import * as PIXI from "pixi.js";
import type { RoomObject, TiledMap } from "./roomDefs";
import { parseTiledMap, FURNITURE_DIMS } from "./roomDefs";
import {
  proj,
  drawFurnitureByType,
  drawHighlight,
  furnitureHitRect,
} from "./pixiRoom";

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
  backgroundGraphics: PIXI.Graphics;
  furnitureLayer: PIXI.Container;
  highlightGraphics: PIXI.Graphics;
  items: Map<number, FurnitureItem>;
  /** Redraw a single furniture item at its current position */
  updateItem: (id: number, wx: number, wy: number, wz: number) => void;
  /** Set the selected item (draws highlight) */
  setSelected: (id: number | null) => void;
  /** Replace all furniture objects (e.g. after loading saved state) */
  rebuild: (objects: RoomObject[]) => void;
}

// ─── Load room JSON from URL ──────────────────────────────────────────────────

export async function loadRoomJSON(url: string): Promise<RoomObject[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load room: ${url}`);
  const json: TiledMap = await res.json();
  return parseTiledMap(json);
}

// ─── Build interactive PixiJS scene ──────────────────────────────────────────

function createFurnitureItem(
  obj: RoomObject,
  handlers: FurnitureHandlers,
): FurnitureItem {
  const container = new PIXI.Container();
  const graphics = new PIXI.Graphics();
  container.addChild(graphics);

  drawFurnitureByType(graphics, obj.furnitureType, obj.wx, obj.wy, obj.wz);

  // Depth sort key: screen Y of furniture center
  const d = FURNITURE_DIMS[obj.furnitureType] ?? { w: 1, d: 1, h: 0 };
  const [, cy] = proj(obj.wx + d.w / 2, obj.wy + d.d / 2, obj.wz);
  container.zIndex = cy;

  // Hit area: bounding rectangle covering all visible faces
  container.hitArea = furnitureHitRect(obj.furnitureType, obj.wx, obj.wy, obj.wz);
  container.eventMode = "static";
  container.cursor = "pointer";

  container.on("pointertap", (e: PIXI.FederatedPointerEvent) => {
    e.stopPropagation();
    handlers.onSelect(obj.id);
  });

  if (obj.draggable) {
    container.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
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
): RoomScene {
  // Three layers in draw order
  const backgroundGraphics = new PIXI.Graphics();
  const furnitureLayer = new PIXI.Container();
  const highlightGraphics = new PIXI.Graphics();

  furnitureLayer.sortableChildren = true;
  stage.addChild(backgroundGraphics);
  stage.addChild(furnitureLayer);
  stage.addChild(highlightGraphics);

  // Make stage interactive so drag events propagate
  stage.eventMode = "static";
  stage.hitArea = new PIXI.Rectangle(0, 0, 860, 500);

  const items = new Map<number, FurnitureItem>();

  function populateFurniture(objs: RoomObject[]) {
    furnitureLayer.removeChildren();
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

    const d = FURNITURE_DIMS[item.obj.furnitureType] ?? { w: 1, d: 1, h: 0 };
    const [, cy] = proj(wx + d.w / 2, wy + d.d / 2, wz);
    item.container.zIndex = cy;
    item.container.hitArea = furnitureHitRect(item.obj.furnitureType, wx, wy, wz);
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
  }

  return { backgroundGraphics, furnitureLayer, highlightGraphics, items, updateItem, setSelected, rebuild };
}
