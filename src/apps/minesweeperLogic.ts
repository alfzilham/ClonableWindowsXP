/** Pure Minesweeper rules. All functions return new boards; nothing mutates its input. */

export interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
}

export type Status = 'ready' | 'playing' | 'won' | 'lost';

export interface Board {
  rows: number;
  cols: number;
  mines: number;
  cells: Cell[];
  status: Status;
  revealedCount: number;
  /** Index of the mine that ended the game, if any. */
  exploded: number | null;
}

export type LevelId = 'beginner' | 'intermediate' | 'expert';

export const LEVELS: Record<LevelId, { rows: number; cols: number; mines: number; label: string }> = {
  beginner: { rows: 9, cols: 9, mines: 10, label: 'Beginner' },
  intermediate: { rows: 16, cols: 16, mines: 40, label: 'Intermediate' },
  expert: { rows: 16, cols: 30, mines: 99, label: 'Expert' },
};

export type Rng = () => number;

export function createBoard(rows: number, cols: number, mines: number): Board {
  const total = rows * cols;
  if (mines >= total) throw new RangeError('Too many mines for the board size');
  return {
    rows,
    cols,
    mines,
    cells: Array.from({ length: total }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 })),
    status: 'ready',
    revealedCount: 0,
    exploded: null,
  };
}

export function neighbors(board: Pick<Board, 'rows' | 'cols'>, index: number): number[] {
  const r = Math.floor(index / board.cols);
  const c = index % board.cols;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < board.rows && nc >= 0 && nc < board.cols) out.push(nr * board.cols + nc);
    }
  }
  return out;
}

/** Lay mines on a fresh board, keeping `safeIndex` mine-free (first-click safety). */
export function placeMines(board: Board, safeIndex: number, rng: Rng = Math.random): Board {
  const candidates = board.cells.map((_, i) => i).filter((i) => i !== safeIndex);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const cells = board.cells.map((c) => ({ ...c }));
  candidates.slice(0, board.mines).forEach((i) => {
    cells[i].mine = true;
  });
  cells.forEach((cell, i) => {
    cell.adjacent = neighbors(board, i).filter((n) => cells[n].mine).length;
  });
  return { ...board, cells, status: 'playing' };
}

function floodReveal(cells: Cell[], board: Board, start: number): number {
  let count = 0;
  const queue = [start];
  while (queue.length) {
    const i = queue.pop() as number;
    const cell = cells[i];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    count++;
    if (cell.adjacent === 0 && !cell.mine) queue.push(...neighbors(board, i));
  }
  return count;
}

function finish(board: Board, cells: Cell[], revealedCount: number, hitMine: number | null): Board {
  if (hitMine !== null) {
    cells.forEach((c) => {
      if (c.mine && !c.flagged) c.revealed = true;
    });
    return { ...board, cells, revealedCount, status: 'lost', exploded: hitMine };
  }
  if (revealedCount === board.cells.length - board.mines) {
    cells.forEach((c) => {
      if (c.mine) c.flagged = true;
    });
    return { ...board, cells, revealedCount, status: 'won' };
  }
  return { ...board, cells, revealedCount };
}

export function reveal(board: Board, index: number, rng: Rng = Math.random): Board {
  if (board.status === 'won' || board.status === 'lost') return board;
  let current = board;
  if (current.status === 'ready') current = placeMines(current, index, rng);
  const target = current.cells[index];
  if (!target || target.revealed || target.flagged) return current;
  const cells = current.cells.map((c) => ({ ...c }));
  if (cells[index].mine) {
    cells[index].revealed = true;
    return finish(current, cells, current.revealedCount, index);
  }
  const gained = floodReveal(cells, current, index);
  return finish(current, cells, current.revealedCount + gained, null);
}

export function toggleFlag(board: Board, index: number): Board {
  if (board.status === 'won' || board.status === 'lost') return board;
  const cell = board.cells[index];
  if (!cell || cell.revealed) return board;
  const cells = board.cells.map((c, i) => (i === index ? { ...c, flagged: !c.flagged } : c));
  return { ...board, cells };
}

/** Reveal all neighbours of a satisfied number (middle-click / double-click). */
export function chord(board: Board, index: number): Board {
  if (board.status !== 'playing') return board;
  const cell = board.cells[index];
  if (!cell.revealed || cell.adjacent === 0) return board;
  const around = neighbors(board, index);
  const flags = around.filter((n) => board.cells[n].flagged).length;
  if (flags !== cell.adjacent) return board;
  let next = board;
  for (const n of around) {
    if (!next.cells[n].flagged && !next.cells[n].revealed) next = reveal(next, n);
  }
  return next;
}

export function flagsUsed(board: Board): number {
  return board.cells.filter((c) => c.flagged).length;
}
