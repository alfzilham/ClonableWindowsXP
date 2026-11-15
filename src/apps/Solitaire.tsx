import { useState, type CSSProperties, type MouseEvent } from 'react';
import { closeWindow, showDialog } from '../core/os';
import { MenuBar, type Menu } from './shared/MenuBar';
import {
  autoToFoundation,
  drawFromStock,
  isRed,
  isWon,
  move,
  newGame,
  rankLabel,
  takeCards,
  type Card,
  type Game,
  type Source,
  type Target,
} from './solitaireLogic';
import type { AppProps } from './types';

const SUIT_GLYPH: Record<Card['suit'], string> = { S: '♠', H: '♥', D: '♦', C: '♣' };

interface CardViewProps {
  card?: Card;
  selected?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
  onDoubleClick?: () => void;
  placeholder?: string;
}

function CardView({ card, selected, style, onClick, onDoubleClick, placeholder }: CardViewProps) {
  // Handled clicks must not bubble to the pile/table handlers that also react to clicks.
  const handleClick = onClick ? (e: MouseEvent) => { e.stopPropagation(); onClick(); } : undefined;
  if (!card) {
    return <div className="card slot" style={style}>{placeholder}</div>;
  }
  if (!card.faceUp) return <div className="card back" style={style} />;
  return (
    <div
      className={`card face ${isRed(card.suit) ? 'red' : 'black'}${selected ? ' selected' : ''}`}
      style={style}
      onClick={handleClick}
      onDoubleClick={onDoubleClick}
    >
      <span className="card-corner">{rankLabel(card.rank)}{SUIT_GLYPH[card.suit]}</span>
      <span className="card-center">{SUIT_GLYPH[card.suit]}</span>
    </div>
  );
}

const sameSource = (a: Source | null, b: Source) =>
  !!a && a.pile === b.pile && ('i' in a ? 'i' in b && a.i === b.i : true) && ('index' in a ? 'index' in b && a.index === b.index : true);

export function Solitaire({ windowId }: AppProps) {
  const [game, setGame] = useState<Game>(() => newGame());
  const [sel, setSel] = useState<Source | null>(null);
  const [announced, setAnnounced] = useState(false);

  const apply = (next: Game | null): boolean => {
    if (!next) return false;
    setGame(next);
    setSel(null);
    if (isWon(next) && !announced) {
      setAnnounced(true);
      showDialog({ title: 'Solitaire', message: `Congratulations, you won in ${next.moves} moves!`, icon: 'info' });
    }
    return true;
  };

  const restart = () => {
    setGame(newGame());
    setSel(null);
    setAnnounced(false);
  };

  const tryMove = (target: Target) => {
    if (sel && !apply(move(game, sel, target))) setSel(null);
  };

  const select = (source: Source) => setSel(sameSource(sel, source) ? null : source);

  const menus: Menu[] = [
    { label: 'Game', items: [{ label: 'Deal', onClick: restart }, { separator: true }, { label: 'Exit', onClick: () => closeWindow(windowId) }] },
  ];

  const waste = game.waste[game.waste.length - 1];

  return (
    <div className="solitaire">
      <MenuBar menus={menus} />
      <div className="sol-table" onClick={() => setSel(null)}>
        <div className="sol-top">
          <div className="sol-pile" onClick={(e) => { e.stopPropagation(); apply(drawFromStock(game)); }}>
            {game.stock.length ? <CardView card={{ ...game.stock[game.stock.length - 1], faceUp: false }} /> : <CardView placeholder={'↻'} />}
          </div>
          <div className="sol-pile" onClick={(e) => e.stopPropagation()}>
            {waste ? (
              <CardView
                card={waste}
                selected={sel?.pile === 'waste'}
                onClick={() => select({ pile: 'waste' })}
                onDoubleClick={() => apply(autoToFoundation(game, { pile: 'waste' }))}
              />
            ) : <CardView />}
          </div>
          <div className="sol-spacer" />
          {game.foundations.map((pile, i) => {
            const top = pile[pile.length - 1];
            return (
              <div key={i} className="sol-pile" onClick={(e) => { e.stopPropagation(); if (sel) tryMove({ pile: 'foundation', i }); else if (top) select({ pile: 'foundation', i }); }}>
                {top ? <CardView card={top} selected={sel?.pile === 'foundation' && sel.i === i} /> : <CardView placeholder="A" />}
              </div>
            );
          })}
        </div>
        <div className="sol-tableau">
          {game.tableau.map((pile, i) => (
            <div key={i} className="sol-column" onClick={(e) => { e.stopPropagation(); if (sel) tryMove({ pile: 'tableau', i }); }}>
              {pile.length === 0 && <CardView placeholder="K" />}
              {pile.map((card, index) => {
                const top = pile.slice(0, index).reduce((y, c) => y + (c.faceUp ? 22 : 10), 0);
                const source: Source = { pile: 'tableau', i, index };
                const selectedHere = sel?.pile === 'tableau' && sel.i === i && index >= sel.index;
                return (
                  <CardView
                    key={card.id}
                    card={card}
                    selected={selectedHere}
                    style={{ position: 'absolute', top }}
                    onClick={card.faceUp ? () => {
                      if (sel && !(sel.pile === 'tableau' && sel.i === i)) {
                        if (!apply(move(game, sel, { pile: 'tableau', i }))) select(source);
                      } else select(source);
                    } : undefined}
                    onDoubleClick={index === pile.length - 1 ? () => apply(autoToFoundation(game, source)) : undefined}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="statusbar"><span>Moves: {game.moves}</span><span>{sel && takeCards(game, sel) ? 'Select a destination' : ''}</span></div>
    </div>
  );
}
