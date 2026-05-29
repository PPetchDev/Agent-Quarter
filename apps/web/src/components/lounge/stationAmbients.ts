/**
 * Per-station ambient shape table.
 *
 * Keep this module PIXI-free so it can be unit-tested without a canvas and
 * reused outside the renderer. The PIXI interpreter that consumes the table
 * lives in `pixiRoom.ts` (`drawStationAmbient`).
 *
 * Shape coordinates:
 *   - `fx*` / `fz*` are fractions of `FURNITURE_DIMS[type].w` / `.h`.
 *   - `yOff` is an absolute world Y offset (station faces sit near front/back
 *     at small absolute depths, so proportional `d` would zero out for thin
 *     boards like `document_board` with `d = 0.05`).
 */
export type AmbientShape =
  | { kind: "face"; fx0: number; fz0: number; fx1: number; fz1: number; yOff: number; color: number; alpha: number }
  | { kind: "halo"; fx: number; yOff: number; fz: number; rx: number; ry: number; color: number; alpha: number }
  | { kind: "point"; fx: number; yOff: number; fz: number; r: number; color: number; alpha: number }
  | { kind: "topOutline"; color: number; alpha: number; lineWidth: number; fillAlpha: number };

export const STATION_AMBIENTS: Record<string, AmbientShape[]> = {
  computer_desk: [
    // Monitor face — wx+[0.40..1.70] / wz+[0.95..1.75] on a 3.0 × 2.0 × 2.35 box.
    { kind: "face", fx0: 0.133, fz0: 0.404, fx1: 0.567, fz1: 0.745, yOff: 1.49, color: 0xbce7ff, alpha: 0.58 },
    { kind: "halo", fx: 0.35, yOff: 1.49, fz: 0.574, rx: 44, ry: 30, color: 0x60a5fa, alpha: 0.32 },
  ],
  printer: [
    { kind: "halo", fx: 0.82, yOff: 0.02, fz: 0.44, rx: 18, ry: 18, color: 0xfacc15, alpha: 0.42 },
    { kind: "point", fx: 0.82, yOff: 0.02, fz: 0.44, r: 7, color: 0xfde68a, alpha: 1.0 },
  ],
  bookcase: [
    { kind: "halo", fx: 0.5, yOff: 0.5, fz: 1.028, rx: 60, ry: 26, color: 0xfde68a, alpha: 0.42 },
    { kind: "face", fx0: 0.0, fz0: 0.194, fx1: 1.0, fz1: 0.972, yOff: -0.01, color: 0xfacc15, alpha: 0.16 },
  ],
  document_board: [
    { kind: "face", fx0: 0.027, fz0: 0.05, fx1: 0.973, fz1: 0.95, yOff: -0.04, color: 0xfacc15, alpha: 0.28 },
    { kind: "point", fx: 0.467, yOff: -0.05, fz: 0.906, r: 10, color: 0xfde68a, alpha: 0.9 },
  ],
  low_table: [
    { kind: "topOutline", color: 0xfacc15, alpha: 1.0, lineWidth: 3.5, fillAlpha: 0.16 },
  ],
  bed: [
    { kind: "halo", fx: 0.5, yOff: 0.65, fz: 0.677, rx: 54, ry: 22, color: 0xfde68a, alpha: 0.52 },
  ],
};
