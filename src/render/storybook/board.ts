/**
 * Storybook board painters, illuminated-manuscript style: the board is a
 * painted panel on a vellum page — a lapis ground with a gold diaper
 * pattern in a burnished gold frame — inside a gilded page border with vine
 * margins and corner pieces. Above and below the panel the page has scenery
 * bands (see sceneryArt.ts). The marks are restyled to match: the sealed line
 * is chained, the boss target branded with vermilion brackets, badges are seals.
 */
import { cellCenter, cellOrigin, gridExtent, type BoardLayout } from '../layout';
import { lineRect, type BoardMarks } from '../marks';
import type { Scenery } from '../scenery';
import type { BoardArt, Theme } from '../theme';
import { roundRectPath, type AnyContext2D } from '../tilePainter';
import { blobPath, hatch, sealBadge, seeded, speckle } from './ink';
import {
  CRIMSON,
  CRIMSON_LIGHT,
  GOLD,
  GOLD_LIGHT,
  INK,
  LAPIS,
  LAPIS_DEEP,
  PARCHMENT,
  PARCHMENT_DEEP,
  PARCHMENT_LIGHT,
  PARCHMENT_SHADE,
  SOCKET,
  VERDIGRIS,
  VERMILION,
} from './palette';
import { goldLeaf } from './tiles';
import { paintScenery, type Frame } from './sceneryArt';

/** Width of the panel's gold frame beyond the outer cells, as a fraction of a cell. */
const RIM = 0.1;

/** Where the page border, the margins, the panel and the bands are. */
export function frameOf(layout: BoardLayout): Frame {
  const rim = layout.cell * RIM;
  const grid = gridExtent(layout);
  return {
    width: layout.size,
    height: layout.height,
    border: Math.max(3, Math.min(layout.size, layout.height) * 0.014),
    panelX: layout.padding - rim,
    panelTop: layout.originY - rim,
    panelBottom: layout.originY + grid + rim,
    panelSize: grid + rim * 2,
    cell: layout.cell,
  };
}

/** A sinuous vine with leaves, buds and gold dots along a vertical margin (own design). */
function vine(ctx: AnyContext2D, x: number, y0: number, y1: number, w: number, seed: number): void {
  if (y1 - y0 < w * 2 || w < 4) return;
  const rnd = seeded(seed);
  const amp = w * 0.28;
  const wave = w * 3.6;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(1, w * 0.08);
  ctx.beginPath();
  for (let y = y0; y <= y1; y += 2) {
    const px = x + Math.sin(((y - y0) / wave) * Math.PI * 2) * amp;
    if (y === y0) ctx.moveTo(px, y);
    else ctx.lineTo(px, y);
  }
  ctx.stroke();
  let side = 1;
  for (let y = y0 + wave * 0.25; y < y1 - w * 0.3; y += wave / 2) {
    const px = x + Math.sin(((y - y0) / wave) * Math.PI * 2) * amp;
    const lx = px + side * w * 0.24;
    // Leaf.
    ctx.beginPath();
    ctx.ellipse(lx, y - w * 0.1, w * 0.22, w * 0.1, side * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = VERDIGRIS;
    ctx.fill();
    ctx.lineWidth = Math.max(0.6, w * 0.04);
    ctx.strokeStyle = INK;
    ctx.stroke();
    // Bud or gold dot on the other side.
    const bx = px - side * w * 0.2;
    ctx.beginPath();
    ctx.arc(bx, y + w * 0.12, w * (rnd() < 0.5 ? 0.09 : 0.07), 0, Math.PI * 2);
    ctx.fillStyle = rnd() < 0.5 ? VERMILION : GOLD;
    ctx.fill();
    ctx.stroke();
    side = -side;
  }
  ctx.restore();
}

/** A gilded corner piece: a lapis square with a gold quatrefoil. */
function cornerPiece(ctx: AnyContext2D, cx: number, cy: number, r: number): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.fillStyle = goldLeaf(ctx, cx - r, cy - r, r * 2);
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.strokeStyle = INK;
  ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = LAPIS;
  ctx.fillRect(cx - r * 0.72, cy - r * 0.72, r * 1.44, r * 1.44);
  ctx.strokeRect(cx - r * 0.72, cy - r * 0.72, r * 1.44, r * 1.44);
  // Quatrefoil: four lobes round a centre.
  ctx.fillStyle = GOLD_LIGHT;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r * 0.26, cy + Math.sin(a) * r * 0.26, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = VERMILION;
  ctx.fill();
  ctx.lineWidth = Math.max(0.6, r * 0.06);
  ctx.stroke();
  ctx.restore();
}

function background(
  ctx: AnyContext2D,
  layout: BoardLayout,
  _theme: Theme,
  _pixelRatio: number,
  scenery: Scenery,
): void {
  const W = layout.size;
  const H = layout.height;
  const f = frameOf(layout);
  const b = f.border;
  ctx.save();
  roundRectPath(ctx, 0, 0, W, H, layout.boardRadius);
  ctx.clip();

  // Vellum, aged towards the edges.
  const paper = ctx.createRadialGradient(
    W * 0.45,
    H * 0.42,
    Math.min(W, H) * 0.1,
    W / 2,
    H / 2,
    Math.max(W, H) * 0.75,
  );
  paper.addColorStop(0, PARCHMENT_LIGHT);
  paper.addColorStop(0.6, PARCHMENT);
  paper.addColorStop(1, PARCHMENT_SHADE);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.16;
  const rb = seeded(3);
  for (const [bx, by, br] of [
    [0.08, 0.9, 0.14],
    [0.95, 0.1, 0.12],
    [0.6, 0.02, 0.09],
  ] as const) {
    const radii = Array.from({ length: 9 }, () => 0.75 + rb() * 0.4);
    ctx.fillStyle = PARCHMENT_DEEP;
    blobPath(ctx, W * bx, H * by, W * br, W * br * 0.8, radii, rb() * 6);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  speckle(
    ctx,
    seeded(2048),
    0,
    0,
    W,
    H,
    Math.round((W * H) / 90),
    ['#8a6a3e', '#6b4f2c', '#ffffff'],
    [0.5, 1.4],
    [0.06, 0.2],
  );

  // Gilded page border: ink rule, gold leaf, ink rule, then a red (rubric) ruling inside.
  ctx.lineJoin = 'round';
  ctx.lineWidth = b * 0.9;
  ctx.strokeStyle = goldLeaf(ctx, 0, 0, Math.max(W, H));
  roundRectPath(ctx, b * 0.45, b * 0.45, W - b * 0.9, H - b * 0.9, layout.boardRadius);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, b * 0.18);
  ctx.strokeStyle = INK;
  roundRectPath(ctx, 0.5, 0.5, W - 1, H - 1, layout.boardRadius);
  ctx.stroke();
  roundRectPath(ctx, b * 0.9, b * 0.9, W - b * 1.8, H - b * 1.8, layout.boardRadius * 0.6);
  ctx.stroke();
  ctx.lineWidth = Math.max(0.8, b * 0.14);
  ctx.strokeStyle = VERMILION;
  ctx.strokeRect(b * 1.5, b * 1.5, W - b * 3, H - b * 3);

  // Vine margins beside the panel.
  const margin = f.panelX - b * 1.5;
  vine(
    ctx,
    (b * 1.5 + f.panelX) / 2,
    f.panelTop + margin * 0.2,
    f.panelBottom - margin * 0.2,
    margin,
    5,
  );
  vine(
    ctx,
    W - (b * 1.5 + f.panelX) / 2,
    f.panelTop + margin * 0.2,
    f.panelBottom - margin * 0.2,
    margin,
    9,
  );

  // The painted panel: lapis ground, gold diaper, burnished gold frame.
  const px = f.panelX;
  const py = f.panelTop;
  const ps = f.panelSize;
  ctx.save();
  ctx.fillStyle = 'rgba(20, 12, 30, 0.4)';
  ctx.fillRect(px + 1.5, py + 3, ps, ps);
  const ground = ctx.createLinearGradient(px, py, px, py + ps);
  ground.addColorStop(0, LAPIS);
  ground.addColorStop(1, LAPIS_DEEP);
  ctx.fillStyle = ground;
  ctx.fillRect(px, py, ps, ps);
  ctx.beginPath();
  ctx.rect(px, py, ps, ps);
  ctx.clip();
  const step = layout.cell * 0.32;
  ctx.strokeStyle = 'rgba(246, 219, 126, 0.22)';
  ctx.lineWidth = Math.max(0.6, layout.cell * 0.01);
  ctx.beginPath();
  for (let i = -ps; i <= ps * 2; i += step) {
    ctx.moveTo(px + i, py);
    ctx.lineTo(px + i + ps, py + ps);
    ctx.moveTo(px + i + ps, py);
    ctx.lineTo(px + i, py + ps);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(246, 219, 126, 0.4)';
  for (let yy = py; yy < py + ps; yy += step) {
    for (let xx = px + step / 2; xx < px + ps; xx += step) {
      ctx.beginPath();
      ctx.arc(xx, yy, layout.cell * 0.018, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  const fw = layout.cell * RIM * 0.9;
  ctx.lineWidth = fw;
  ctx.strokeStyle = goldLeaf(ctx, px, py, ps);
  ctx.strokeRect(px + fw / 2, py + fw / 2, ps - fw, ps - fw);
  ctx.lineWidth = Math.max(1.2, layout.cell * 0.025);
  ctx.strokeStyle = INK;
  ctx.strokeRect(px, py, ps, ps);
  ctx.lineWidth = Math.max(0.8, layout.cell * 0.012);
  ctx.strokeRect(px + fw, py + fw, ps - fw * 2, ps - fw * 2);

  // Sockets: a deeper lapis well with a thin gold rule and a faint quatrefoil.
  const rr = layout.cell * 0.1;
  for (let row = 0; row < layout.gridSize; row++) {
    for (let col = 0; col < layout.gridSize; col++) {
      const o = cellOrigin(layout, row, col);
      const c = layout.cell;
      roundRectPath(ctx, o.x, o.y, c, c, rr);
      ctx.fillStyle = SOCKET;
      ctx.fill();
      ctx.save();
      ctx.clip();
      roundRectPath(ctx, o.x - c * 0.06, o.y - c * 0.06, c + c * 0.04, c + c * 0.04, rr);
      ctx.lineWidth = c * 0.1;
      ctx.strokeStyle = 'rgba(5, 8, 30, 0.55)';
      ctx.stroke();
      ctx.restore();
      roundRectPath(ctx, o.x + c * 0.08, o.y + c * 0.08, c * 0.84, c * 0.84, rr * 0.6);
      ctx.lineWidth = Math.max(0.6, c * 0.012);
      ctx.strokeStyle = 'rgba(246, 219, 126, 0.35)';
      ctx.stroke();
      ctx.fillStyle = 'rgba(246, 219, 126, 0.16)';
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.arc(
          o.x + c / 2 + Math.cos(a) * c * 0.07,
          o.y + c / 2 + Math.sin(a) * c * 0.07,
          c * 0.065,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }

  paintScenery(ctx, f, scenery);

  // Corner pieces last, over the border.
  const cr = Math.max(b * 1.6, layout.cell * 0.13);
  for (const [x, y] of [
    [cr * 0.9, cr * 0.9],
    [W - cr * 0.9, cr * 0.9],
    [cr * 0.9, H - cr * 0.9],
    [W - cr * 0.9, H - cr * 0.9],
  ] as const) {
    cornerPiece(ctx, x, y, cr);
  }
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
  ctx.fillStyle = 'rgba(196, 56, 28, 0.32)';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = 'rgba(246, 219, 126, 0.45)';
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
    [GOLD, link * 0.2],
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
        GOLD_LIGHT,
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
