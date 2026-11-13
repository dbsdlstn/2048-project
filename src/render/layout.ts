import { NEON_LAYOUT, type LayoutStyle } from './theme';

/**
 * Board geometry in CSS pixels. Pure: given the board's on-screen size and the
 * grid size it tells where every cell is. Positions may be fractional
 * (row 1.5 = halfway between rows 1 and 2), which is what sliding tiles use.
 */

export interface BoardLayout {
  /** Width (= height) of the whole board in CSS pixels. */
  readonly size: number;
  readonly gridSize: number;
  /** Outer padding between the board edge and the first cell. */
  readonly padding: number;
  /** Gap between neighbouring cells. */
  readonly gap: number;
  /** Width (= height) of one cell. */
  readonly cell: number;
  /** Corner radius of a cell / tile. */
  readonly radius: number;
  /** Corner radius of the board itself. */
  readonly boardRadius: number;
}

const RADIUS_RATIO = 0.16;

/**
 * The theme decides the proportions (`LayoutStyle`): neon keeps padding = gap
 * so the edges look even; the storybook theme widens the padding into a
 * decorated frame drawn inside the canvas.
 */
export function computeLayout(
  size: number,
  gridSize: number,
  style: LayoutStyle = NEON_LAYOUT,
): BoardLayout {
  // size = 2 * padding + gridSize * cell + (gridSize - 1) * gap, with padding = p * cell, gap = g * cell
  const cell = size / (gridSize + (gridSize - 1) * style.gap + 2 * style.padding);
  return {
    size,
    gridSize,
    padding: cell * style.padding,
    gap: cell * style.gap,
    cell,
    radius: cell * RADIUS_RATIO,
    boardRadius: size * style.boardRadius,
  };
}

/** Top-left corner (CSS px) of the cell at a possibly fractional row / column. */
export function cellOrigin(
  layout: BoardLayout,
  row: number,
  col: number,
): { x: number; y: number } {
  const step = layout.cell + layout.gap;
  return { x: layout.padding + col * step, y: layout.padding + row * step };
}

/** Centre (CSS px) of the cell at a possibly fractional row / column. */
export function cellCenter(
  layout: BoardLayout,
  row: number,
  col: number,
): { x: number; y: number } {
  const o = cellOrigin(layout, row, col);
  return { x: o.x + layout.cell / 2, y: o.y + layout.cell / 2 };
}

/**
 * The cell under a point in board space (CSS px from the board's top-left), or
 * null outside the grid. Half of each gap counts towards the neighbouring
 * cells, so a tap between two tiles still picks the nearer one.
 */
export function cellAtPoint(
  layout: BoardLayout,
  x: number,
  y: number,
): { row: number; col: number } | null {
  const step = layout.cell + layout.gap;
  const col = Math.floor((x - layout.padding + layout.gap / 2) / step);
  const row = Math.floor((y - layout.padding + layout.gap / 2) / step);
  if (row < 0 || col < 0 || row >= layout.gridSize || col >= layout.gridSize) return null;
  return { row, col };
}
