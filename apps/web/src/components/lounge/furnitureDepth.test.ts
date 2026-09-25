import { describe, expect, it } from 'vitest';
import mapJson from '../../../public/maps/maple_hideout.json';
import { mustDrawAfter, resolveFurnitureZ } from './furnitureDepth';
import { footprintFor, parseTiledMap, type RoomObject, type TiledMap } from './roomDefs';

// Today's roomLoader key (back-edge screen Y + x tie-break) at the 10x8 room projection.
const S = 61;
const OY = 590;
const base = (o: RoomObject) => {
  const fp = footprintFor(o.furnitureType, o.rotation);
  return OY - (o.wy + fp.d) * S * 0.65 - o.wz * S + o.wx * 4 + o.wz * 25;
};

const obj = (over: Partial<RoomObject> & Pick<RoomObject, 'id' | 'furnitureType'>): RoomObject => ({
  label: '',
  description: '',
  wx: 0,
  wy: 0,
  wz: 0,
  happiness: 0,
  draggable: true,
  ...over,
});

describe('mustDrawAfter', () => {
  it('requires a quarter-turned bookcase to cover the plant on its left', () => {
    const bookcase = obj({ id: 1, furnitureType: 'bookcase', wx: 1, wy: 5, rotation: 1 });
    const plant = obj({ id: 2, furnitureType: 'plant', wx: 0, wy: 5 });
    expect(base(bookcase)).toBeLessThan(base(plant));
    expect(mustDrawAfter(bookcase, plant)).toBe(true);
    expect(mustDrawAfter(plant, bookcase)).toBe(false);
  });

  it('leaves diagonal neighbours unconstrained', () => {
    const a = obj({ id: 1, furnitureType: 'plant', wx: 0, wy: 0 });
    const b = obj({ id: 2, furnitureType: 'plant', wx: 1, wy: 1 });
    expect(mustDrawAfter(a, b)).toBe(false);
    expect(mustDrawAfter(b, a)).toBe(false);
  });

  it('does not constrain items whose screen footprints cannot overlap', () => {
    // Desk at the back right and a cushion at the front left: "in front of" on y, but
    // their projected x ranges (x + 0.65y) never meet, so neither can cover the other.
    const desk = obj({ id: 1, furnitureType: 'computer_desk', wx: 6, wy: 6 });
    const cushion = obj({ id: 2, furnitureType: 'zabuton', wx: 1, wy: 4, rotation: 1 });
    expect(mustDrawAfter(desk, cushion)).toBe(false);
    expect(mustDrawAfter(cushion, desk)).toBe(false);
  });

  it('ignores wall-mounted items', () => {
    const scroll = obj({ id: 1, furnitureType: 'hanging_scroll', wx: 0, wy: 8, wz: 2 });
    const plant = obj({ id: 2, furnitureType: 'plant', wx: 0, wy: 5 });
    expect(mustDrawAfter(plant, scroll)).toBe(false);
    expect(mustDrawAfter(scroll, plant)).toBe(false);
  });
});

describe('resolveFurnitureZ', () => {
  it('lifts the rotated bookcase above the plant and leaves the plant alone', () => {
    const bookcase = obj({ id: 1, furnitureType: 'bookcase', wx: 1, wy: 5, rotation: 1 });
    const plant = obj({ id: 2, furnitureType: 'plant', wx: 0, wy: 5 });
    const z = resolveFurnitureZ([bookcase, plant], base);
    expect(z.get(1)!).toBeGreaterThan(z.get(2)!);
    expect(z.get(2)).toBe(base(plant));
  });

  it('drops the lift again once the plant moves away', () => {
    const bookcase = obj({ id: 1, furnitureType: 'bookcase', wx: 1, wy: 5, rotation: 1 });
    const plant = obj({ id: 2, furnitureType: 'plant', wx: 5, wy: 0 });
    expect(resolveFurnitureZ([bookcase, plant], base).get(1)).toBe(base(bookcase));
  });

  it('satisfies every constraint on the default map without lowering anything', () => {
    const objects = parseTiledMap(mapJson as TiledMap);
    const z = resolveFurnitureZ(objects, base);
    for (const a of objects) {
      expect(z.get(a.id)!).toBeGreaterThanOrEqual(base(a));
      for (const b of objects) {
        if (mustDrawAfter(a, b)) expect(z.get(a.id)!).toBeGreaterThan(z.get(b.id)!);
      }
    }
  });
});
