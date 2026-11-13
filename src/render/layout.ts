import { NEON_LAYOUT, type LayoutStyle } from './theme';

/**
 * Board geometry in CSS pixels. Pure: given the board's on-screen size and the
 * grid size it tells where every cell is. Positions may be fractional
 * (row 1.5 = halfway between rows 1 and 2), which is what sliding tiles use.
 */

export interface BoardLayout {
  /** Width of the whole board canvas in CSS pixels (neon: also its height). */
  readonly size: number;
  /** Height of the board canvas; larger than `size` when the theme has scenery bands. */
  readonly height: number;
  readonly gridSize: number;
  /** Left padding: from the board's left edge to the first column. */
  readonly padding: number;
  /** From the board's top edge to the first row (= padding on a square board). */
  readonly originY: number;
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

/** Width of the grid itself (cells and the gaps between them). */
export function gridExtent(layout: BoardLayout): number {
  return layout.gridSize * layout.cell + (layout.gridSize - 1) * layout.gap;
}

/**
 * The theme decides the proportions (`LayoutStyle`). Neon is square, with
 * padding = gap so the edges look even. A theme with `bands` may be taller
 * than wide: the cell size comes from the width (side padding only), and the
 * extra height becomes a top and a bottom band for scenery, each at least
 * `bands.min` cells. If the height cannot even give the minimum bands, cells
 * shrink to fit and the grid is centred horizontally.
 */
export function computeLayout(
  size: number,
  gridSize: number,
  style: LayoutStyle = NEON_LAYOUT,
  height: number = size,
): BoardLayout {
  const span = gridSize + (gridSize - 1) * style.gap;
  const bands = style.bands;
  if (!bands) {
    // size = 2 * padding + gridSize * cell + (gridSize - 1) * gap, with padding = p * cell, gap = g * cell
    const cell = size / (span + 2 * style.padding);
    const padding = cell * style.padding;
    return {
      size,
      height: size,
      gridSize,
      padding,
      originY: padding,
      gap: cell * style.gap,
      cell,
      radius: cell * RADIUS_RATIO,
      boardRadius: size * style.boardRadius,
    };
  }
  const cell = Math.min(size / (span + 2 * style.padding), height / (span + 2 * bands.min));
  const grid = span * cell;
  const spare = Math.max(0, height - grid);
  return {
    size,
    height,
    gridSize,
    padding: (size - grid) / 2,
    originY: spare * bands.topShare,
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
  return { x: layout.padding + col * step, y: layout.originY + row * step };
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
  const row = Math.floor((y - layout.originY + layout.gap / 2) / step);
  if (row < 0 || col < 0 || row >= layout.gridSize || col >= layout.gridSize) return null;
  return { row, col };
}
