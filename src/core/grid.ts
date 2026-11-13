import type { Direction, Position } from './types';

/** Converts a row-major cell index into a position. */
export function toPosition(index: number, size: number): Position {
  return { row: Math.floor(index / size), col: index % size };
}

/** Converts a position into a row-major cell index. */
export function toIndex(pos: Position, size: number): number {
  return pos.row * size + pos.col;
}

/**
 * Cell indices of every line that slides in `direction`, each ordered from the
 * edge tiles move *toward*. Example (size 4, 'left'): [[0,1,2,3],[4,5,6,7],...].
 */
export function linesFor(direction: Direction, size: number): number[][] {
  const lines: number[][] = [];
  for (let a = 0; a < size; a++) {
    const line: number[] = [];
    for (let b = 0; b < size; b++) {
      switch (direction) {
        case 'left':
          line.push(a * size + b);
          break;
        case 'right':
          line.push(a * size + (size - 1 - b));
          break;
        case 'up':
          line.push(b * size + a);
          break;
        case 'down':
          line.push((size - 1 - b) * size + a);
          break;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Orthogonal neighbours of a cell that lie on the board. */
export function neighbors(index: number, size: number): number[] {
  const { row, col } = toPosition(index, size);
  const out: number[] = [];
  if (row > 0) out.push(index - size);
  if (row < size - 1) out.push(index + size);
  if (col > 0) out.push(index - 1);
  if (col < size - 1) out.push(index + 1);
  return out;
}
