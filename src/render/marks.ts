/**
 * Board marks: computable information drawn on the board itself (the
 * warden's sealed line, the corroder's next target, the cells a targeted
 * relic accepts) and the static board background (slots, circuit traces and
 * the rift). The game layer decides *what* is marked (`BoardMarks`); this
 * module only knows how to draw it.
 */
import type { LineAxis, Position, TileId } from '../core';
import { cellCenter, cellOrigin, gridExtent, type BoardLayout } from './layout';
import type { BoardArt, Theme } from './theme';
import { CHIP_CUT, chipPath, roundRectPath } from './tilePainter';

export interface TargetingMarks {
  /** What the relic will do to the picked tile (decides the colour). */
  readonly effect: 'destroy' | 'freeze';
  /** Cells the player may pick. */
  readonly cells: readonly Position[];
}

export interface BoardMarks {
  readonly lock: {
    readonly axis: LineAxis;
    readonly index: number;
    readonly turnsLeft: number;
  } | null;
  /** The tile the corroder will halve on its next trigger. */
  readonly bossTarget: { readonly tileId: TileId; readonly turnsUntil: number } | null;
  readonly targeting: TargetingMarks | null;
}

export const NO_MARKS: BoardMarks = { lock: null, bossTarget: null, targeting: null };

/** Rectangle covering one row or column of cells (gap included), in board space. */
export function lineRect(
  layout: BoardLayout,
  axis: LineAxis,
  index: number,
): { x: number; y: number; w: number; h: number } {
  const half = layout.gap / 2;
  const start = cellOrigin(layout, axis === 'row' ? index : 0, axis === 'col' ? index : 0);
  const long = gridExtent(layout) + layout.gap;
  const short = layout.cell + layout.gap;
  return axis === 'row'
    ? { x: layout.padding - half, y: start.y - half, w: long, h: short }
    : { x: start.x - half, y: layout.originY - half, w: short, h: long };
}

/** Neon static background: plate, circuit traces in the gaps, the rift, and chip-shaped slots. */
export function paintBoardBackground(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  layout: BoardLayout,
  theme: Theme,
  pixelRatio: number,
): void {
  const { size } = layout;
  ctx.save();
  roundRectPath(ctx, 0, 0, size, size, layout.boardRadius);
  ctx.fillStyle = theme.board;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = theme.boardEdge;
  ctx.stroke();
  ctx.clip();

  // The rift: a jagged glowing crack under the circuitry, seen only between slots.
  const rift: readonly (readonly [number, number])[] = [
    [-0.05, 0.22],
    [0.18, 0.3],
    [0.33, 0.27],
    [0.47, 0.46],
    [0.6, 0.5],
    [0.71, 0.69],
    [0.86, 0.74],
    [1.05, 0.93],
  ];
  ctx.beginPath();
  rift.forEach(([px, py], i) => {
    if (i === 0) ctx.moveTo(px * size, py * size);
    else ctx.lineTo(px * size, py * size);
  });
  ctx.strokeStyle = theme.boardAccent;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(1.5, size * 0.006);
  ctx.shadowColor = theme.boardAccent;
  ctx.shadowBlur = size * 0.03 * pixelRatio;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  // Circuit traces along the gap centres, with vias where they cross.
  const step = layout.cell + layout.gap;
  ctx.strokeStyle = theme.boardDetail;
  ctx.fillStyle = theme.boardDetail;
  ctx.lineWidth = Math.max(1, layout.gap * 0.18);
  ctx.beginPath();
  for (let i = 0; i <= layout.gridSize; i++) {
    const p = layout.padding - layout.gap / 2 + i * step;
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
  }
  ctx.stroke();
  for (let r = 0; r <= layout.gridSize; r++) {
    for (let c = 0; c <= layout.gridSize; c++) {
      const x = layout.padding - layout.gap / 2 + c * step;
      const y = layout.padding - layout.gap / 2 + r * step;
      ctx.fillRect(
        x - layout.gap * 0.22,
        y - layout.gap * 0.22,
        layout.gap * 0.44,
        layout.gap * 0.44,
      );
    }
  }

  // Slots.
  for (let row = 0; row < layout.gridSize; row++) {
    for (let col = 0; col < layout.gridSize; col++) {
      const o = cellOrigin(layout, row, col);
      chipPath(ctx, o.x, o.y, layout.cell, layout.cell, layout.cell * CHIP_CUT);
      ctx.fillStyle = theme.cell;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(130, 120, 255, 0.18)';
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A slow 0..1..0 wave for pulsing marks. */
function wave(now: number, period = 1100): number {
  return 0.5 - 0.5 * Math.cos(((now % period) / period) * Math.PI * 2);
}

/** Drawn under the tiles: the sealed line's hatched band, dimmed cells while targeting. */
export function paintMarksBelow(
  ctx: CanvasRenderingContext2D,
  layout: BoardLayout,
  marks: BoardMarks,
): void {
  const lock = marks.lock;
  if (!lock) return;
  const r = lineRect(layout, lock.axis, lock.index);
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 77, 109, 0.16)';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  // Diagonal hazard hatching.
  ctx.strokeStyle = 'rgba(255, 77, 109, 0.35)';
  ctx.lineWidth = Math.max(1.5, layout.gap * 0.35);
  const spacing = layout.cell * 0.22;
  ctx.beginPath();
  for (let d = -r.h; d < r.w + r.h; d += spacing) {
    ctx.moveTo(r.x + d, r.y + r.h);
    ctx.lineTo(r.x + d + r.h, r.y);
  }
  ctx.stroke();
  ctx.restore();
}

/** Drawn over the tiles: lock rails + badge, boss target reticle, targeting outlines. */
export function paintMarksAbove(
  ctx: CanvasRenderingContext2D,
  layout: BoardLayout,
  marks: BoardMarks,
  theme: Theme,
  now: number,
  /** Live position of a tile (it may be sliding), for the boss target. */
  tilePosition: (id: TileId) => { row: number; col: number; scale: number } | null,
): void {
  ctx.save();
  if (marks.lock) {
    const r = lineRect(layout, marks.lock.axis, marks.lock.index);
    ctx.strokeStyle = theme.lock;
    ctx.lineWidth = Math.max(2, layout.gap * 0.3);
    ctx.shadowColor = theme.lock;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    if (marks.lock.axis === 'row') {
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + r.w, r.y);
      ctx.moveTo(r.x, r.y + r.h);
      ctx.lineTo(r.x + r.w, r.y + r.h);
    } else {
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x, r.y + r.h);
      ctx.moveTo(r.x + r.w, r.y);
      ctx.lineTo(r.x + r.w, r.y + r.h);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Badge with the sealed moves left, centred on the first rail end.
    const br = layout.cell * 0.15;
    // Kept inside the board (the canvas clips anything past its edge).
    const bx = marks.lock.axis === 'row' ? r.x + br + 2 : r.x + r.w / 2;
    const by = marks.lock.axis === 'row' ? r.y + r.h / 2 : r.y + br + 2;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = theme.lock;
    ctx.fill();
    ctx.font = `800 ${br * 1.25}px ${theme.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(marks.lock.turnsLeft), bx, by + br * 0.06);
  }

  if (marks.bossTarget) {
    const p = tilePosition(marks.bossTarget.tileId);
    if (p && p.scale > 0.2) {
      const c = cellCenter(layout, p.row, p.col);
      const half = (layout.cell / 2) * p.scale + layout.gap * 0.3;
      const arm = layout.cell * 0.22;
      ctx.strokeStyle = theme.bossTarget;
      ctx.lineWidth = Math.max(2, layout.cell * 0.045);
      ctx.lineCap = 'round';
      ctx.shadowColor = theme.bossTarget;
      ctx.shadowBlur = 6;
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
      ctx.shadowBlur = 0;
      // Turns-until badge on the top-left corner.
      const br = layout.cell * 0.15;
      // Inside the bracket so it never pokes past the board edge.
      const bx = c.x - half + br * 0.9;
      const by = c.y - half + br * 0.9;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = theme.bossTarget;
      ctx.fill();
      ctx.font = `800 ${br * 1.25}px ${theme.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1a0d00';
      ctx.fillText(String(marks.bossTarget.turnsUntil), bx, by + br * 0.06);
    }
  }

  const targeting = marks.targeting;
  if (targeting) {
    const valid = new Set(targeting.cells.map((p) => p.row * layout.gridSize + p.col));
    const color = targeting.effect === 'freeze' ? theme.ice : theme.targetDestroy;
    // Dim everything the relic cannot take.
    ctx.fillStyle = theme.dim;
    for (let row = 0; row < layout.gridSize; row++) {
      for (let col = 0; col < layout.gridSize; col++) {
        if (valid.has(row * layout.gridSize + col)) continue;
        const o = cellOrigin(layout, row, col);
        chipPath(ctx, o.x - 1, o.y - 1, layout.cell + 2, layout.cell + 2, layout.cell * CHIP_CUT);
        ctx.fill();
      }
    }
    // Pulsing dashed outline around the cells it can take.
    const grow = layout.gap * (0.15 + 0.25 * wave(now, 900));
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, layout.cell * 0.04);
    ctx.setLineDash([layout.cell * 0.12, layout.cell * 0.07]);
    ctx.lineDashOffset = -(now / 40) % 100;
    for (const p of targeting.cells) {
      const o = cellOrigin(layout, p.row, p.col);
      chipPath(
        ctx,
        o.x - grow,
        o.y - grow,
        layout.cell + grow * 2,
        layout.cell + grow * 2,
        layout.cell * CHIP_CUT,
      );
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/** The neon theme's board painters. */
export const NEON_BOARD_ART: BoardArt = {
  background: paintBoardBackground,
  marksBelow: paintMarksBelow,
  marksAbove: paintMarksAbove,
};

/**
 * Whether marks need continuous redraws. Only the short-lived targeting
 * outline pulses; long-lived marks stay still so an idle board costs no frames.
 */
export function marksAnimate(marks: BoardMarks): boolean {
  return marks.targeting !== null;
}
