import { footprintFor, type RoomObject } from './roomDefs';

/** Items at or above this height hang on the wall (same threshold as checkCollision). */
const WALL_ITEM_MIN_Z = 1.5;
/** Smallest zIndex step used when an item is lifted above another. */
const DEPTH_EPSILON = 0.01;
/** Screen-x shift per tile of depth, matching projAt in pixiRoom (x·S + y·S·0.65). */
const DEPTH_SKEW_X = 0.65;

interface FloorRect {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function rectOf(obj: RoomObject): FloorRect {
  const fp = footprintFor(obj.furnitureType, obj.rotation);
  return { minX: obj.wx, maxX: obj.wx + fp.w, minY: obj.wy, maxY: obj.wy + fp.d };
}

/** The view sees the -y (front) and +x (right) faces, so only nearer items on one axis can cover. */
function nearerOnAnAxis(a: FloorRect, b: FloorRect): boolean {
  return a.maxY <= b.minY || a.minX >= b.maxX;
}

/**
 * Screen x is x + 0.65·y (height does not change it), so two items can only overlap on
 * screen when their projected footprint x ranges do. Pairs that cannot overlap get no
 * constraint, which keeps lifts (and their effect on agents in the same layer) minimal.
 */
function screenXOverlap(a: FloorRect, b: FloorRect): boolean {
  return (
    a.minX + DEPTH_SKEW_X * a.minY < b.maxX + DEPTH_SKEW_X * b.maxY &&
    b.minX + DEPTH_SKEW_X * b.minY < a.maxX + DEPTH_SKEW_X * a.maxY
  );
}

/** True when floor item `a` must be painted after `b`. Diagonal, far-apart and overlapping pairs are unconstrained. */
export function mustDrawAfter(a: RoomObject, b: RoomObject): boolean {
  if (a.wz >= WALL_ITEM_MIN_Z || b.wz >= WALL_ITEM_MIN_Z) return false;
  const ra = rectOf(a);
  const rb = rectOf(b);
  return nearerOnAnAxis(ra, rb) && !nearerOnAnAxis(rb, ra) && screenXOverlap(ra, rb);
}

/**
 * Depth for each object: its base key, lifted only as far as needed to sit above every
 * item it must cover. No scalar key orders boxes correctly on its own (a tall item turned
 * sideways can cover a neighbour whose back edge is nearer), so this runs a topological
 * pass over the "must draw after" graph. Unlifted items keep their base value, so agents
 * that share the layer interleave exactly as before.
 */
export function resolveFurnitureZ(
  objects: readonly RoomObject[],
  baseZ: (obj: RoomObject) => number,
): Map<number, number> {
  const preds: number[][] = objects.map(() => []);
  const succs: number[][] = objects.map(() => []);
  objects.forEach((a, i) =>
    objects.forEach((b, j) => {
      if (i !== j && mustDrawAfter(a, b)) {
        preds[i]!.push(j);
        succs[j]!.push(i);
      }
    }),
  );

  const z = objects.map((o) => baseZ(o));
  const indegree = preds.map((p) => p.length);
  const queue = indegree.flatMap((d, i) => (d === 0 ? [i] : []));
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head]!;
    for (const p of preds[i]!) z[i] = Math.max(z[i]!, z[p]! + DEPTH_EPSILON);
    for (const s of succs[i]!) {
      indegree[s]! -= 1;
      if (indegree[s] === 0) queue.push(s);
    }
  }
  // Items left in a cycle (not observed for disjoint footprints) keep their base value.
  return new Map(objects.map((o, i) => [o.id, z[i]!]));
}
