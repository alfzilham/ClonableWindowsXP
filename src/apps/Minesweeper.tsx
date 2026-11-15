import { useEffect, useState } from 'react';
import { closeWindow, setWindowSize } from '../core/os';
import { MenuBar, type Menu } from './shared/MenuBar';
import { LEVELS, chord, createBoard, flagsUsed, reveal, toggleFlag, type Board, type LevelId } from './minesweeperLogic';
import type { AppProps } from './types';

const CELL = 16;

const led = (n: number) => {
  const clamped = Math.max(-99, Math.min(999, Math.trunc(n)));
  return clamped < 0 ? `-${String(Math.abs(clamped)).padStart(2, '0')}` : String(clamped).padStart(3, '0');
};

const newBoard = (level: LevelId) => createBoard(LEVELS[level].rows, LEVELS[level].cols, LEVELS[level].mines);

export function Minesweeper({ windowId }: AppProps) {
  const [level, setLevel] = useState<LevelId>('beginner');
  const [board, setBoard] = useState<Board>(() => newBoard('beginner'));
  const [seconds, setSeconds] = useState(0);
  const [pressing, setPressing] = useState(false);

  const { rows, cols } = LEVELS[level];

  useEffect(() => {
    setWindowSize(windowId, cols * CELL + 36, rows * CELL + 142);
  }, [windowId, rows, cols]);

  useEffect(() => {
    if (board.status !== 'playing') return;
    const id = window.setInterval(() => setSeconds((s) => Math.min(999, s + 1)), 1000);
    return () => window.clearInterval(id);
  }, [board.status]);

  const start = (next: LevelId) => {
    setLevel(next);
    setBoard(newBoard(next));
    setSeconds(0);
  };

  const menus: Menu[] = [
    {
      label: 'Game',
      items: [
        { label: 'New', shortcut: 'F2', onClick: () => start(level) },
        { separator: true },
        ...(Object.keys(LEVELS) as LevelId[]).map((id) => ({ label: LEVELS[id].label, checked: level === id, onClick: () => start(id) })),
        { separator: true },
        { label: 'Exit', onClick: () => closeWindow(windowId) },
      ],
    },
  ];

  const face = board.status === 'lost' ? '😵' : board.status === 'won' ? '😎' : pressing ? '😮' : '🙂';

  return (
    <div className="minesweeper" tabIndex={0} onKeyDown={(e) => e.key === 'F2' && start(level)}>
      <MenuBar menus={menus} />
      <div className="mine-panel">
        <div className="mine-header">
          <span className="led">{led(board.mines - flagsUsed(board))}</span>
          <button type="button" className="smiley" onClick={() => start(level)} aria-label="New game">{face}</button>
          <span className="led">{led(seconds)}</span>
        </div>
        <div
          className="mine-grid"
          style={{ gridTemplateColumns: `repeat(${cols}, ${CELL}px)` }}
          onContextMenu={(e) => e.preventDefault()}
          onPointerUp={() => setPressing(false)}
          onPointerLeave={() => setPressing(false)}
        >
          {board.cells.map((cell, i) => {
            const isBoom = board.exploded === i;
            const wrongFlag = board.status === 'lost' && cell.flagged && !cell.mine;
            let content = '';
            if (cell.revealed) content = cell.mine ? '✸' : cell.adjacent ? String(cell.adjacent) : '';
            else if (cell.flagged) content = wrongFlag ? '✗' : '⚑';
            return (
              <button
                key={i}
                type="button"
                className={`mine-cell${cell.revealed ? ' open' : ''}${isBoom ? ' boom' : ''} n${cell.adjacent}${cell.flagged ? ' flag' : ''}`}
                onPointerDown={(e) => {
                  if (e.button === 0) setPressing(true);
                }}
                onClick={() => setBoard((b) => reveal(b, i))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setBoard((b) => toggleFlag(b, i));
                }}
                onDoubleClick={() => setBoard((b) => chord(b, i))}
                onAuxClick={(e) => e.button === 1 && setBoard((b) => chord(b, i))}
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
