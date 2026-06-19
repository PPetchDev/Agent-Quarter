import * as PIXI from 'pixi.js';
import { RoomTheme, ROOM_TILES_X, ROOM_TILES_Y, proj } from './pixiRoom';

// ─── Deterministic pseudo-random ──────────────────────────────────────────────

function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

// ─── Particle configs per theme ───────────────────────────────────────────────

interface ParticleConfig {
    count: number;
    color: number;
    alpha: number;
    size: number;
    glowColor?: number;
    glowAlpha?: number;
    glowSize?: number;
    shape: 'circle' | 'sparkle';
}

function getParticleConfig(theme: RoomTheme): ParticleConfig {
    const skyTop = theme.skyTop;
    if (skyTop === '#2a1a3e') {
        // Night — golden fireflies
        return { count: 9, color: 0xffdd66, alpha: 0.85, size: 2.0, glowColor: 0xffdd44, glowAlpha: 0.15, glowSize: 6.0, shape: 'circle' };
    }
    if (skyTop === '#ffd1dc') {
        // Dawn — soft sparkles
        return { count: 7, color: 0xffffff, alpha: 0.6, size: 1.5, glowColor: 0xffffff, glowAlpha: 0.08, glowSize: 4.0, shape: 'sparkle' };
    }
    if (skyTop === '#fff8e8') {
        // Afternoon — subtle specks
        return { count: 5, color: 0xffffe0, alpha: 0.35, size: 1.2, shape: 'circle' };
    }
    if (skyTop === '#ffb6c1') {
        // Dusk — fireflies + embers
        return { count: 8, color: 0xffcc77, alpha: 0.75, size: 2.0, glowColor: 0xff9944, glowAlpha: 0.12, glowSize: 5.5, shape: 'circle' };
    }
    // Morning (#e0f0ff) — sunbeam motes
    return { count: 6, color: 0xffffcc, alpha: 0.5, size: 1.5, glowColor: 0xffffaa, glowAlpha: 0.06, glowSize: 3.5, shape: 'circle' };
}

// ─── Draw sparkle shape (4-point star) ────────────────────────────────────────

function drawSparkle(g: PIXI.Graphics, cx: number, cy: number, size: number, color: number, alpha: number) {
    const s = size;
    g.beginFill(color, alpha);
    g.moveTo(cx, cy - s);
    g.lineTo(cx + s * 0.3, cy - s * 0.3);
    g.lineTo(cx + s, cy);
    g.lineTo(cx + s * 0.3, cy + s * 0.3);
    g.lineTo(cx, cy + s);
    g.lineTo(cx - s * 0.3, cy + s * 0.3);
    g.lineTo(cx - s, cy);
    g.lineTo(cx - s * 0.3, cy - s * 0.3);
    g.closePath();
    g.endFill();
}

// ─── Main draw function ──────────────────────────────────────────────────────

/**
 * Draw ambient theme particles (fireflies, sparkles, dust motes)
 * onto a PIXI.Graphics layer. Uses the same projection as the room
 * so particles stay correctly positioned across resizes.
 *
 * Call AFTER setRoomProjection() has been called for the current room size.
 */
export function drawThemeParticles(
    g: PIXI.Graphics,
    cols: number = ROOM_TILES_X,
    rows: number = ROOM_TILES_Y,
    theme?: RoomTheme,
) {
    g.clear();

    if (!theme) return;

    const config = getParticleConfig(theme);
    if (config.count === 0) return;

    // Seed derived from theme + room size — stable per render, varies per config
    const seed = theme.skyTop.length * 137 + cols * rows;
    const rand = seededRandom(seed);

    for (let i = 0; i < config.count; i++) {
        // Random position in world space (wx, wy, wz)
        const wx = 0.5 + rand() * (cols - 1);
        const wy = 0.3 + rand() * (rows - 0.6);
        const wz = 0.2 + rand() * 4.3; // height: near-floor to crown molding

        // Project world → screen using the room's dynamic projection
        const [sx, sy] = proj(wx, wy, wz);

        // Skip if off-canvas
        if (sx < -60 || sx > 1300 || sy < -60 || sy > 700) continue;

        // Glow halo
        if (config.glowColor !== undefined && config.glowAlpha !== undefined && config.glowSize !== undefined) {
            const gAlpha = config.glowAlpha * (0.6 + rand() * 0.4);
            const gSize = config.glowSize * (0.7 + rand() * 0.3);
            g.beginFill(config.glowColor, gAlpha);
            g.drawCircle(sx, sy, gSize);
            g.endFill();
        }

        // Core particle
        if (config.shape === 'sparkle') {
            const sparkleSize = config.size * (0.7 + rand() * 0.6);
            drawSparkle(g, sx, sy, sparkleSize, config.color, config.alpha * (0.6 + rand() * 0.4));
        } else {
            const cAlpha = config.alpha * (0.5 + rand() * 0.5);
            const cSize = config.size * (0.6 + rand() * 0.8);
            g.beginFill(config.color, cAlpha);
            g.drawCircle(sx, sy, cSize);
            g.endFill();
        }
    }
}
