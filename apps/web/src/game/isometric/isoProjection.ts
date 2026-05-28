/**
 * Standalone isometric projection utilities.
 *
 * These are pure functions that do not depend on PixiJS globals.
 * Use isoToScreen for testing, tooling, or any context where
 * the PixiJS-based proj() function from pixiRoom is not available.
 *
 * For live lounge rendering, use the proj() function from
 * components/lounge/pixiRoom.ts which reads the current room projection.
 */

export type IsoPoint = {
  /** World x (column, left→right on screen) */
  x: number;
  /** World y (row, front→back) */
  y: number;
  /** World z (height above floor, lifts vertically) */
  z?: number;
};

export type ScreenPoint = {
  x: number;
  y: number;
};

export type IsoProjectionConfig = {
  /** Screen x of the world origin (0, 0, 0) */
  originX: number;
  /** Screen y of the world origin (0, 0, 0) */
  originY: number;
  /** Screen width of one tile (diamond width = tileWidth) */
  tileWidth: number;
  /** Screen height of one tile row (diamond height = tileHeight) */
  tileHeight: number;
};

/**
 * Classic diamond (dimetric) isometric projection.
 *
 * x increases → moves right and down
 * y increases → moves left and down
 * z increases → moves up (lifts off floor)
 */
export function isoToScreen(
  point: IsoPoint,
  config: IsoProjectionConfig,
): ScreenPoint {
  const z = point.z ?? 0;
  return {
    x: config.originX + (point.x - point.y) * (config.tileWidth / 2),
    y: config.originY + (point.x + point.y) * (config.tileHeight / 2) - z,
  };
}

/**
 * Inverse: convert screen coordinates back to iso world (x, y) at z=0.
 * Useful for click-to-tile mapping.
 */
export function screenToIso(
  screen: ScreenPoint,
  config: IsoProjectionConfig,
): IsoPoint {
  const relX = screen.x - config.originX;
  const relY = screen.y - config.originY;
  const halfW = config.tileWidth / 2;
  const halfH = config.tileHeight / 2;
  return {
    x: relX / (2 * halfW) + relY / (2 * halfH),
    y: relY / (2 * halfH) - relX / (2 * halfW),
    z: 0,
  };
}
