/**
 * Storybook board painters: a walnut tray with carved sockets, set on a
 * parchment frame with a gold-leaf border, and the board marks restyled —
 * the sealed line is chained, the boss target is branded with crimson ink
 * brackets, badges are wax seals.
 */
import { cellCenter, cellOrigin, type BoardLayout } from '../layout';
import { lineRect, type BoardMarks } from '../marks';
import type { Scenery } from '../scenery';
import type { BoardArt, Theme } from '../theme';
import { roundRectPath, type AnyContext2D } from '../tilePainter';
import { hatch, sealBadge, seeded, speckle, wobblyRoundRect } from './ink';
import {
  CRIMSON,
  CRIMSON_LIGHT,
  GOLD,
  GOLD_DARK,
  GOLD_LIGHT,
  INK,
  IRON,
  PARCHMENT,
  PARCHMENT_DEEP,
  PARCHMENT_LIGHT,
  PARCHMENT_SHADE,
  SOCKET,
  WOOD,
  WOOD_DARK,
  WOOD_LIGHT,
} from './palette';
import { bloom, paintSceneryBehind, paintSceneryFront, type Frame } from './sceneryArt';

/** Width of the tray's rim beyond the outer sockets, as a fraction of a cell. */
const RIM = 0.1;

/** Where the frame band ends and the tray begins. */
export function frameOf(layout: BoardLayout): Frame {
  const band = Math.max(4, layout.padding - layout.cell * RIM);
  return { size: layout.size, band, border: Math.max(3, layout.size * 0.016) };
}

function background(
  ctx: AnyContext2D,
  layout: BoardLayout,
  _theme: Theme,
  _pixelRatio: number,
  scenery: Scenery,
): void {
  const S = layout.size;
  const f = frameOf(layout);
  const rnd = seeded(2048);
  ctx.save();

  // Parchment.
  roundRectPath(ctx, 0, 0, S, S, layout.boardRadius);
  ctx.clip();
  const paper = ctx.createRadialGradient(S * 0.45, S * 0.4, S * 0.1, S / 2, S / 2, S * 0.75);
  paper.addColorStop(0, PARCHMENT_LIGHT);
  paper.addColorStop(0.65, PARCHMENT);
  paper.addColorStop(1, PARCHMENT_SHADE);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, S, S);
  // Watercolour blooms and grain (texture without assets: many cheap seeded marks).
  ctx.globalAlpha = 0.18;
  bloom(ctx, S * 0.08, S * 0.9, S * 0.12, PARCHMENT_DEEP, 3);
  bloom(ctx, S * 0.95, S * 0.12, S * 0.1, PARCHMENT_DEEP, 5);
  bloom(ctx, S * 0.6, S * 0.02, S * 0.08, PARCHMENT_DEEP, 9);
  ctx.globalAlpha = 1;
  speckle(
    ctx,
    rnd,
    0,
    0,
    S,
    S,
    Math.round((S * S) / 90),
    ['#8a6a3e', '#6b4f2c', '#ffffff'],
    [0.5, 1.4],
    [0.06, 0.2],
  );
  // Burnt edge.
  const burn = ctx.createRadialGradient(S / 2, S / 2, S * 0.42, S / 2, S / 2, S * 0.74);
  burn.addColorStop(0, 'rgba(120, 76, 30, 0)');
  burn.addColorStop(1, 'rgba(120, 76, 30, 0.35)');
  ctx.fillStyle = burn;
  ctx.fillRect(0, 0, S, S);

  // Gold-leaf border: ink rule, gold band, ink rule.
  const b = f.border;
  ctx.lineJoin = 'round';
  roundRectPath(ctx, b * 0.35, b * 0.35, S - b * 0.7, S - b * 0.7, layout.boardRadius);
  ctx.lineWidth = b * 0.7;
  const leaf = ctx.createLinearGradient(0, 0, S, S);
  leaf.addColorStop(0, GOLD_LIGHT);
  leaf.addColorStop(0.3, GOLD);
  leaf.addColorStop(0.55, GOLD_LIGHT);
  leaf.addColorStop(0.8, GOLD);
  leaf.addColorStop(1, GOLD_DARK);
  ctx.strokeStyle = leaf;
  ctx.stroke();
  ctx.lineWidth = Math.max(1, b * 0.18);
  ctx.strokeStyle = INK;
  roundRectPath(ctx, b * 0.7, b * 0.7, S - b * 1.4, S - b * 1.4, layout.boardRadius * 0.8);
  ctx.stroke();
  roundRectPath(ctx, 0.5, 0.5, S - 1, S - 1, layout.boardRadius);
  ctx.stroke();
  // Corner knots.
  for (const [x, y] of [
    [b * 0.7, b * 0.7],
    [S - b * 0.7, b * 0.7],
    [b * 0.7, S - b * 0.7],
    [S - b * 0.7, S - b * 0.7],
  ] as const) {
    const k = b * 1.3;
    ctx.beginPath();
    ctx.moveTo(x, y - k);
    ctx.lineTo(x + k, y);
    ctx.lineTo(x, y + k);
    ctx.lineTo(x - k, y);
    ctx.closePath();
    ctx.fillStyle = GOLD;
    ctx.fill();
    ctx.lineWidth = Math.max(1, b * 0.2);
    ctx.strokeStyle = INK;
    ctx.stroke();
  }

  paintSceneryBehind(ctx, f, scenery);

  // The walnut tray.
  const t = f.band;
  const w = S - t * 2;
  ctx.save();
  wobblyRoundRect(ctx, t + 1.5, t + 3, w, w, layout.cell * 0.16, 0, seeded(1));
  ctx.fillStyle = 'rgba(43, 29, 16, 0.45)';
  ctx.fill();
  wobblyRoundRect(
    ctx,
    t,
    t,
    w,
    w,
    layout.cell * 0.16,
    layout.cell * 0.006,
    seeded(12),
    layout.cell * 0.2,
  );
  const wood = ctx.createLinearGradient(t, t, t, t + w);
  wood.addColorStop(0, WOOD_LIGHT);
  wood.addColorStop(0.5, WOOD);
  wood.addColorStop(1, WOOD_DARK);
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Grain: long wavy strokes across the planks.
  const grain = seeded(64);
  ctx.lineWidth = Math.max(0.6, layout.cell * 0.012);
  for (let y = t; y < t + w; y += layout.cell * 0.07) {
    ctx.strokeStyle = grain() < 0.5 ? 'rgba(40, 22, 8, 0.28)' : 'rgba(255, 220, 170, 0.1)';
    ctx.beginPath();
    const amp = layout.cell * (0.01 + grain() * 0.03);
    const phase = grain() * 6;
    for (let x = t; x <= t + w; x += layout.cell * 0.1) {
      const yy = y + Math.sin(phase + x / (layout.cell * 0.7)) * amp;
      if (x === t) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  // A knot or two.
  ctx.strokeStyle = 'rgba(40, 22, 8, 0.35)';
  for (const [kx, ky] of [
    [0.82, 0.12],
    [0.15, 0.7],
  ] as const) {
    for (let r = 1; r <= 3; r++) {
      ctx.beginPath();
      ctx.ellipse(
        t + w * kx,
        t + w * ky,
        layout.cell * 0.05 * r,
        layout.cell * 0.025 * r,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
  }
  ctx.restore();
  wobblyRoundRect(
    ctx,
    t,
    t,
    w,
    w,
    layout.cell * 0.16,
    layout.cell * 0.006,
    seeded(12),
    layout.cell * 0.2,
  );
  ctx.lineWidth = Math.max(1.5, layout.cell * 0.035);
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();

  // Carved sockets.
  const rr = layout.cell * 0.18;
  for (let row = 0; row < layout.gridSize; row++) {
    for (let col = 0; col < layout.gridSize; col++) {
      const o = cellOrigin(layout, row, col);
      const c = layout.cell;
      roundRectPath(ctx, o.x, o.y, c, c, rr);
      ctx.fillStyle = SOCKET;
      ctx.fill();
      ctx.save();
      ctx.clip();
      // Inner shadow from the upper-left edge.
      roundRectPath(ctx, o.x - c * 0.06, o.y - c * 0.06, c + c * 0.04, c + c * 0.04, rr);
      ctx.lineWidth = c * 0.12;
      ctx.strokeStyle = 'rgba(20, 10, 2, 0.55)';
      ctx.stroke();
      // A faint carved ring in the middle.
      ctx.beginPath();
      ctx.arc(o.x + c / 2, o.y + c / 2, c * 0.2, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(0.8, c * 0.025);
      ctx.strokeStyle = 'rgba(255, 220, 170, 0.08)';
      ctx.stroke();
      ctx.restore();
      // Lit lower-right lip.
      ctx.beginPath();
      ctx.moveTo(o.x + rr, o.y + c);
      ctx.lineTo(o.x + c - rr, o.y + c);
      ctx.quadraticCurveTo(o.x + c, o.y + c, o.x + c, o.y + c - rr);
      ctx.lineTo(o.x + c, o.y + rr);
      ctx.lineWidth = Math.max(0.8, c * 0.018);
      ctx.strokeStyle = 'rgba(255, 220, 170, 0.22)';
      ctx.stroke();
    }
  }

  paintSceneryFront(ctx, f, layout, scenery);
  ctx.restore();
}

function marksBelow(ctx: CanvasRenderingContext2D, layout: BoardLayout, marks: BoardMarks): void {
  const lock = marks.lock;
  if (!lock) return;
  const r = lineRect(layout, lock.axis, lock.index);
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.fillStyle = 'rgba(155, 42, 34, 0.3)';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = 'rgba(200, 71, 58, 0.55)';
  ctx.lineWidth = Math.max(1, layout.gap * 0.22);
  hatch(ctx, r.x, r.y, r.w, r.h, layout.cell * 0.16, -Math.PI / 4);
  ctx.restore();
}

/** A chain along a straight line: alternating flat and edge-on links. */
function chain(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  link: number,
): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(2, Math.floor(len / (link * 0.78)));
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  const angle = Math.atan2(uy, ux);
  const step = len / n;
  for (const [color, width] of [
    [INK, link * 0.36],
    [IRON, link * 0.2],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    for (let i = 0; i < n; i++) {
      const cx = x0 + ux * (i + 0.5) * step;
      const cy = y0 + uy * (i + 0.5) * step;
      ctx.beginPath();
      if (i % 2 === 0) ctx.ellipse(cx, cy, link * 0.55, link * 0.3, angle, 0, Math.PI * 2);
      else {
        ctx.moveTo(cx - ux * link * 0.55, cy - uy * link * 0.55);
        ctx.lineTo(cx + ux * link * 0.55, cy + uy * link * 0.55);
      }
      ctx.stroke();
    }
  }
}

function marksAbove(
  ctx: CanvasRenderingContext2D,
  layout: BoardLayout,
  marks: BoardMarks,
  theme: Theme,
  now: number,
  tilePosition: (id: number) => { row: number; col: number; scale: number } | null,
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (marks.lock) {
    const r = lineRect(layout, marks.lock.axis, marks.lock.index);
    const link = Math.max(6, layout.cell * 0.15);
    if (marks.lock.axis === 'row') {
      chain(ctx, r.x, r.y, r.x + r.w, r.y, link);
      chain(ctx, r.x, r.y + r.h, r.x + r.w, r.y + r.h, link);
    } else {
      chain(ctx, r.x, r.y, r.x, r.y + r.h, link);
      chain(ctx, r.x + r.w, r.y, r.x + r.w, r.y + r.h, link);
    }
    const br = layout.cell * 0.17;
    const bx = marks.lock.axis === 'row' ? r.x + br * 0.6 : r.x + r.w / 2;
    const by = marks.lock.axis === 'row' ? r.y + r.h / 2 : r.y + br * 0.6;
    sealBadge(
      ctx,
      bx,
      by,
      br,
      CRIMSON,
      CRIMSON_LIGHT,
      String(marks.lock.turnsLeft),
      PARCHMENT_LIGHT,
      theme.fontFamily,
    );
  }

  if (marks.bossTarget) {
    const p = tilePosition(marks.bossTarget.tileId);
    if (p && p.scale > 0.2) {
      const c = cellCenter(layout, p.row, p.col);
      const half = (layout.cell / 2) * p.scale + layout.gap * 0.35;
      const arm = layout.cell * 0.26;
      for (const [color, width] of [
        [INK, layout.cell * 0.09],
        [theme.bossTarget, layout.cell * 0.05],
      ] as const) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        for (const [sx, sy] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ] as const) {
          const x = c.x + sx * half;
          const y = c.y + sy * half;
          ctx.moveTo(x - sx * arm, y);
          ctx.lineTo(x, y);
          ctx.lineTo(x, y - sy * arm);
        }
        ctx.stroke();
      }
      const br = layout.cell * 0.16;
      sealBadge(
        ctx,
        c.x - half + br * 0.85,
        c.y - half + br * 0.85,
        br,
        theme.bossTarget,
        '#f3b08a',
        String(marks.bossTarget.turnsUntil),
        PARCHMENT_LIGHT,
        theme.fontFamily,
      );
    }
  }

  const targeting = marks.targeting;
  if (targeting) {
    const valid = new Set(targeting.cells.map((q) => q.row * layout.gridSize + q.col));
    const color = targeting.effect === 'freeze' ? theme.ice : theme.targetDestroy;
    ctx.fillStyle = theme.dim;
    for (let row = 0; row < layout.gridSize; row++) {
      for (let col = 0; col < layout.gridSize; col++) {
        if (valid.has(row * layout.gridSize + col)) continue;
        const o = cellOrigin(layout, row, col);
        roundRectPath(ctx, o.x - 1, o.y - 1, layout.cell + 2, layout.cell + 2, layout.cell * 0.2);
        ctx.fill();
      }
    }
    const pulse = 0.5 - 0.5 * Math.cos(((now % 900) / 900) * Math.PI * 2);
    const grow = layout.gap * (0.15 + 0.3 * pulse);
    ctx.setLineDash([layout.cell * 0.14, layout.cell * 0.08]);
    ctx.lineDashOffset = -(now / 40) % 100;
    for (const q of targeting.cells) {
      const o = cellOrigin(layout, q.row, q.col);
      for (const [stroke, width] of [
        [INK, layout.cell * 0.075],
        [color, layout.cell * 0.04],
      ] as const) {
        roundRectPath(
          ctx,
          o.x - grow,
          o.y - grow,
          layout.cell + grow * 2,
          layout.cell + grow * 2,
          layout.cell * 0.22,
        );
        ctx.strokeStyle = stroke;
        ctx.lineWidth = width;
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
  }
  ctx.restore();
}

export const STORYBOOK_BOARD_ART: BoardArt = { background, marksBelow, marksAbove };
