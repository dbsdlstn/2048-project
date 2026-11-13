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
}

/** Gap as a fraction of a cell; padding uses the same value so edges look even. */
const GAP_RATIO = 0.12;
const RADIUS_RATIO = 0.16;

export function computeLayout(size: number, gridSize: number): BoardLayout {
  // size = 2 * padding + gridSize * cell + (gridSize - 1) * gap, with padding = gap = r * cell
  const cell = size / (gridSize + (gridSize + 1) * GAP_RATIO);
  const gap = cell * GAP_RATIO;
  return { size, gridSize, padding: gap, gap, cell, radius: cell * RADIUS_RATIO };
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
