import { describe, expect, it } from "vitest";

import type { RoomObject } from "./roomDefs";
import { checkCollision } from "./roomDefs";
import { selectPurchasePlacement } from "./purchasePlacement";

function makeObj(partial: Partial<RoomObject> & { id: number; furnitureType: string }): RoomObject {
    return {
        id: partial.id,
        furnitureType: partial.furnitureType,
        label: partial.label ?? partial.furnitureType,
        description: partial.description ?? "",
        wx: partial.wx ?? 0,
        wy: partial.wy ?? 0,
        wz: partial.wz ?? 0,
        happiness: partial.happiness ?? 0,
        draggable: partial.draggable ?? true,
    };
}

describe("selectPurchasePlacement", () => {
    it("falls back to a free tile when default spawn is occupied", () => {
        const existing: RoomObject[] = [
            makeObj({ id: 1, furnitureType: "bed", wx: 0, wy: 0, wz: 0 }),
            makeObj({ id: 2, furnitureType: "plant", wx: 4, wy: 0, wz: 0 }),
        ];

        const placed = selectPurchasePlacement({
            item: {
                type: "nightstand",
                label: "Nightstand",
                description: "",
                happiness: 5,
                draggable: true,
            },
            existingObjects: existing,
            defaultSpawn: { wx: 0, wy: 0, wz: 0 },
            roomW: 6,
            roomH: 6,
        });

        expect(placed).not.toBeNull();
        expect(placed?.wx === 0 && placed?.wy === 0).toBe(false);

        const withPlaced = [...existing, { ...(placed as RoomObject), id: 9999 }];
        expect(checkCollision(withPlaced, 9999, (placed as RoomObject).wx, (placed as RoomObject).wy)).toBe(
            false,
        );
    });

    it("returns null when there is no free space", () => {
        const existing: RoomObject[] = [
            makeObj({ id: 1, furnitureType: "plant", wx: 0, wy: 0, wz: 0 }),
        ];

        const placed = selectPurchasePlacement({
            item: {
                type: "nightstand",
                label: "Nightstand",
                description: "",
                happiness: 5,
                draggable: true,
            },
            existingObjects: existing,
            defaultSpawn: { wx: 0, wy: 0, wz: 0 },
            roomW: 1,
            roomH: 1,
        });

        expect(placed).toBeNull();
    });

    it("keeps default spawn when default position is free", () => {
        const placed = selectPurchasePlacement({
            item: {
                type: "nightstand",
                label: "Nightstand",
                description: "",
                happiness: 5,
                draggable: true,
            },
            existingObjects: [],
            defaultSpawn: { wx: 2, wy: 3, wz: 0 },
            roomW: 10,
            roomH: 8,
        });

        expect(placed).not.toBeNull();
        expect(placed?.wx).toBe(2);
        expect(placed?.wy).toBe(3);
        expect(placed?.wz).toBe(0);
    });
});
