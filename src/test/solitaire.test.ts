import { describe, expect, it } from 'vitest';
import {
  autoToFoundation,
  canPlaceOnFoundation,
  canPlaceOnTableau,
  createDeck,
  drawFromStock,
  isWon,
  move,
  newGame,
  type Card,
  type Game,
} from '../apps/solitaireLogic';

const card = (suit: Card['suit'], rank: number, faceUp = true): Card => ({ id: `${suit}${rank}`, suit, rank, faceUp });
const empty = (): Game => ({ stock: [], waste: [], foundations: [[], [], [], []], tableau: [[], [], [], [], [], [], []], moves: 0 });

describe('solitaire', () => {
  it('builds a 52 card deck', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
  });

  it('deals the klondike layout', () => {
    const g = newGame(() => 0.42);
    expect(g.tableau.map((p) => p.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(g.stock).toHaveLength(24);
    g.tableau.forEach((pile) => {
      expect(pile.filter((c) => c.faceUp)).toHaveLength(1);
      expect(pile[pile.length - 1].faceUp).toBe(true);
    });
    const all = [...g.stock, ...g.tableau.flat()];
    expect(new Set(all.map((c) => c.id)).size).toBe(52);
  });

  it('draws from stock and recycles the waste', () => {
    let g = { ...empty(), stock: [card('S', 1, false), card('H', 2, false)] };
    g = drawFromStock(g);
    expect(g.waste).toHaveLength(1);
    expect(g.waste[0].faceUp).toBe(true);
    g = drawFromStock(g);
    g = drawFromStock(g);
    expect(g.stock).toHaveLength(2);
    expect(g.waste).toHaveLength(0);
    expect(g.stock.every((c) => !c.faceUp)).toBe(true);
  });

  it('tableau rules: alternating colours, descending rank, kings on empty', () => {
    expect(canPlaceOnTableau(card('S', 6), [card('H', 7)])).toBe(true);
    expect(canPlaceOnTableau(card('S', 6), [card('C', 7)])).toBe(false);
    expect(canPlaceOnTableau(card('S', 6), [card('H', 8)])).toBe(false);
    expect(canPlaceOnTableau(card('S', 6), [])).toBe(false);
    expect(canPlaceOnTableau(card('S', 13), [])).toBe(true);
  });

  it('foundation rules: ace first, same suit ascending', () => {
    expect(canPlaceOnFoundation(card('S', 1), [])).toBe(true);
    expect(canPlaceOnFoundation(card('S', 2), [])).toBe(false);
    expect(canPlaceOnFoundation(card('S', 2), [card('S', 1)])).toBe(true);
    expect(canPlaceOnFoundation(card('H', 2), [card('S', 1)])).toBe(false);
  });

  it('moves a run between tableau piles and flips the exposed card', () => {
    const g = empty();
    g.tableau[0] = [card('C', 9, false), card('H', 7), card('S', 6)];
    g.tableau[1] = [card('S', 8)];
    const next = move(g, { pile: 'tableau', i: 0, index: 1 }, { pile: 'tableau', i: 1 });
    expect(next).not.toBeNull();
    expect(next?.tableau[1].map((c) => c.id)).toEqual(['S8', 'H7', 'S6']);
    expect(next?.tableau[0]).toHaveLength(1);
    expect(next?.tableau[0][0].faceUp).toBe(true);
    expect(g.tableau[0]).toHaveLength(3);
  });

  it('refuses illegal moves and face-down sources', () => {
    const g = empty();
    g.tableau[0] = [card('C', 9, false), card('H', 7)];
    g.tableau[1] = [card('S', 9)];
    expect(move(g, { pile: 'tableau', i: 0, index: 1 }, { pile: 'tableau', i: 1 })).toBeNull();
    expect(move(g, { pile: 'tableau', i: 0, index: 0 }, { pile: 'tableau', i: 2 })).toBeNull();
  });

  it('auto-moves to the matching foundation and detects victory', () => {
    let g = empty();
    g.waste = [card('D', 1)];
    const after = autoToFoundation(g, { pile: 'waste' });
    expect(after?.foundations.some((p) => p.length === 1)).toBe(true);
    expect(after?.waste).toHaveLength(0);

    g = empty();
    g.foundations = createDeck().reduce<Card[][]>((acc, c) => {
      acc['SHDC'.indexOf(c.suit)].push(c);
      return acc;
    }, [[], [], [], []]);
    expect(isWon(g)).toBe(true);
  });
});
