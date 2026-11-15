import { describe, expect, it } from 'vitest';
import { chord, createBoard, flagsUsed, neighbors, placeMines, reveal, toggleFlag } from '../apps/minesweeperLogic';

/** Deterministic RNG so mine layouts are reproducible. */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('minesweeper', () => {
  it('counts neighbours at corners and edges', () => {
    const b = createBoard(3, 3, 1);
    expect(neighbors(b, 0)).toHaveLength(3);
    expect(neighbors(b, 1)).toHaveLength(5);
    expect(neighbors(b, 4)).toHaveLength(8);
  });

  it('places the requested number of mines and keeps the first click safe', () => {
    const b = placeMines(createBoard(9, 9, 10), 40, seeded(7));
    expect(b.cells.filter((c) => c.mine)).toHaveLength(10);
    expect(b.cells[40].mine).toBe(false);
    expect(b.status).toBe('playing');
  });

  it('computes adjacency numbers', () => {
    const b = placeMines(createBoard(5, 5, 6), 12, seeded(3));
    b.cells.forEach((cell, i) => {
      expect(cell.adjacent).toBe(neighbors(b, i).filter((n) => b.cells[n].mine).length);
    });
  });

  it('first reveal never loses and floods open areas', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const b = reveal(createBoard(9, 9, 10), 0, seeded(seed));
      expect(b.status === 'playing' || b.status === 'won').toBe(true);
      expect(b.revealedCount).toBeGreaterThan(0);
    }
  });

  it('loses when a mine is revealed and exposes all mines', () => {
    let b = reveal(createBoard(4, 4, 3), 0, seeded(5));
    const mine = b.cells.findIndex((c) => c.mine);
    b = reveal(b, mine);
    expect(b.status).toBe('lost');
    expect(b.exploded).toBe(mine);
    expect(b.cells.filter((c) => c.mine).every((c) => c.revealed)).toBe(true);
  });

  it('wins once every safe cell is revealed', () => {
    let b = reveal(createBoard(4, 4, 2), 0, seeded(11));
    b.cells.forEach((c, i) => {
      if (!c.mine) b = reveal(b, i);
    });
    expect(b.status).toBe('won');
    expect(b.cells.filter((c) => c.mine).every((c) => c.flagged)).toBe(true);
  });

  it('flags block reveals and can be toggled off', () => {
    let b = reveal(createBoard(5, 5, 4), 12, seeded(2));
    const hidden = b.cells.findIndex((c) => !c.revealed);
    b = toggleFlag(b, hidden);
    expect(flagsUsed(b)).toBe(1);
    const before = b.revealedCount;
    b = reveal(b, hidden);
    expect(b.revealedCount).toBe(before);
    b = toggleFlag(b, hidden);
    expect(flagsUsed(b)).toBe(0);
  });

  it('chording reveals neighbours only when flags match', () => {
    let b = reveal(createBoard(6, 6, 5), 0, seeded(9));
    const target = b.cells.findIndex((c, i) => c.revealed && c.adjacent > 0 && neighbors(b, i).some((n) => !b.cells[n].revealed));
    if (target >= 0) {
      const unchanged = chord(b, target);
      expect(unchanged).toBe(b);
      for (const n of neighbors(b, target)) if (b.cells[n].mine) b = toggleFlag(b, n);
      const flagged = neighbors(b, target).filter((n) => b.cells[n].flagged).length;
      if (flagged === b.cells[target].adjacent) {
        expect(chord(b, target).revealedCount).toBeGreaterThan(b.revealedCount - 1);
      }
    }
  });

  it('rejects impossible boards', () => {
    expect(() => createBoard(2, 2, 4)).toThrow(RangeError);
  });
});
