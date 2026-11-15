/** Pure Klondike (draw-one) rules for Solitaire. */

export type Suit = 'S' | 'H' | 'D' | 'C';

export interface Card {
  id: string;
  suit: Suit;
  /** 1 = Ace ... 13 = King */
  rank: number;
  faceUp: boolean;
}

export interface Game {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
  moves: number;
}

export type Source =
  | { pile: 'waste' }
  | { pile: 'foundation'; i: number }
  | { pile: 'tableau'; i: number; index: number };

export type Target = { pile: 'foundation'; i: number } | { pile: 'tableau'; i: number };

export type Rng = () => number;

export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];

export const isRed = (suit: Suit) => suit === 'H' || suit === 'D';

export function rankLabel(rank: number): string {
  return ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' } as Record<number, string>)[rank] ?? String(rank);
}

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) =>
    Array.from({ length: 13 }, (_, i) => ({ id: `${suit}${i + 1}`, suit, rank: i + 1, faceUp: false })),
  );
}

export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function newGame(rng: Rng = Math.random): Game {
  const deck = shuffle(createDeck(), rng);
  const tableau: Card[][] = [];
  let at = 0;
  for (let col = 0; col < 7; col++) {
    const pile = deck.slice(at, at + col + 1).map((c, i, arr) => ({ ...c, faceUp: i === arr.length - 1 }));
    tableau.push(pile);
    at += col + 1;
  }
  return { stock: deck.slice(at), waste: [], foundations: [[], [], [], []], tableau, moves: 0 };
}

const copyGame = (g: Game): Game => ({
  stock: [...g.stock],
  waste: [...g.waste],
  foundations: g.foundations.map((p) => [...p]),
  tableau: g.tableau.map((p) => [...p]),
  moves: g.moves,
});

export function drawFromStock(game: Game): Game {
  const g = copyGame(game);
  if (g.stock.length > 0) {
    const card = g.stock.pop() as Card;
    g.waste.push({ ...card, faceUp: true });
  } else if (g.waste.length > 0) {
    g.stock = g.waste.reverse().map((c) => ({ ...c, faceUp: false }));
    g.waste = [];
  } else return game;
  g.moves++;
  return g;
}

export function canPlaceOnFoundation(card: Card, pile: Card[]): boolean {
  if (pile.length === 0) return card.rank === 1;
  const top = pile[pile.length - 1];
  return top.suit === card.suit && card.rank === top.rank + 1;
}

export function canPlaceOnTableau(card: Card, pile: Card[]): boolean {
  if (pile.length === 0) return card.rank === 13;
  const top = pile[pile.length - 1];
  return top.faceUp && isRed(top.suit) !== isRed(card.suit) && card.rank === top.rank - 1;
}

/** Cards that would travel with the selection, or null if the source is not movable. */
export function takeCards(game: Game, from: Source): Card[] | null {
  if (from.pile === 'waste') return game.waste.length ? [game.waste[game.waste.length - 1]] : null;
  if (from.pile === 'foundation') {
    const pile = game.foundations[from.i];
    return pile.length ? [pile[pile.length - 1]] : null;
  }
  const pile = game.tableau[from.i];
  const cards = pile.slice(from.index);
  if (cards.length === 0 || !cards[0].faceUp) return null;
  return cards;
}

export function move(game: Game, from: Source, to: Target): Game | null {
  const cards = takeCards(game, from);
  if (!cards) return null;
  if (to.pile === 'foundation') {
    if (cards.length !== 1 || !canPlaceOnFoundation(cards[0], game.foundations[to.i])) return null;
  } else {
    if (from.pile === 'tableau' && from.i === to.i) return null;
    if (!canPlaceOnTableau(cards[0], game.tableau[to.i])) return null;
  }
  const g = copyGame(game);
  if (from.pile === 'waste') g.waste.pop();
  else if (from.pile === 'foundation') g.foundations[from.i].pop();
  else {
    g.tableau[from.i] = g.tableau[from.i].slice(0, from.index);
    const pile = g.tableau[from.i];
    if (pile.length && !pile[pile.length - 1].faceUp) pile[pile.length - 1] = { ...pile[pile.length - 1], faceUp: true };
  }
  if (to.pile === 'foundation') g.foundations[to.i].push(...cards);
  else g.tableau[to.i].push(...cards);
  g.moves++;
  return g;
}

/** Send the card to the first foundation that accepts it. */
export function autoToFoundation(game: Game, from: Source): Game | null {
  for (let i = 0; i < 4; i++) {
    const result = move(game, from, { pile: 'foundation', i });
    if (result) return result;
  }
  return null;
}

export function isWon(game: Game): boolean {
  return game.foundations.every((p) => p.length === 13);
}
