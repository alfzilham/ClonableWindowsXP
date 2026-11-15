import { useReducer } from 'react';
import { MenuBar, type Menu } from './shared/MenuBar';
import { initialCalc, press, type CalcKey } from './calcLogic';
import { showDialog } from '../core/os';
import type { AppProps } from './types';

interface KeyDef {
  label: string;
  key: CalcKey;
  cls?: string;
}

const d = (v: string): KeyDef => ({ label: v, key: { type: 'digit', value: v } });

const ROWS: KeyDef[][] = [
  [
    { label: 'MC', key: { type: 'memory', value: 'MC' }, cls: 'mem' },
    d('7'), d('8'), d('9'),
    { label: '/', key: { type: 'op', value: '/' }, cls: 'op' },
    { label: 'sqrt', key: { type: 'sqrt' }, cls: 'fn' },
  ],
  [
    { label: 'MR', key: { type: 'memory', value: 'MR' }, cls: 'mem' },
    d('4'), d('5'), d('6'),
    { label: '*', key: { type: 'op', value: '*' }, cls: 'op' },
    { label: '%', key: { type: 'percent' }, cls: 'fn' },
  ],
  [
    { label: 'MS', key: { type: 'memory', value: 'MS' }, cls: 'mem' },
    d('1'), d('2'), d('3'),
    { label: '-', key: { type: 'op', value: '-' }, cls: 'op' },
    { label: '1/x', key: { type: 'reciprocal' }, cls: 'fn' },
  ],
  [
    { label: 'M+', key: { type: 'memory', value: 'M+' }, cls: 'mem' },
    d('0'),
    { label: '+/-', key: { type: 'negate' } },
    { label: '.', key: { type: 'dot' } },
    { label: '+', key: { type: 'op', value: '+' }, cls: 'op' },
    { label: '=', key: { type: 'equals' }, cls: 'eq' },
  ],
];

const KEYBOARD: Record<string, CalcKey> = {
  '.': { type: 'dot' },
  ',': { type: 'dot' },
  '+': { type: 'op', value: '+' },
  '-': { type: 'op', value: '-' },
  '*': { type: 'op', value: '*' },
  '/': { type: 'op', value: '/' },
  Enter: { type: 'equals' },
  '=': { type: 'equals' },
  Backspace: { type: 'backspace' },
  Escape: { type: 'clear' },
  Delete: { type: 'clearEntry' },
  '%': { type: 'percent' },
};

export function Calculator(_: AppProps) {
  const [state, dispatch] = useReducer(press, undefined, initialCalc);

  const menus: Menu[] = [
    { label: 'Edit', items: [{ label: 'Copy', shortcut: 'Ctrl+C', onClick: () => void navigator.clipboard?.writeText(state.display) }] },
    { label: 'Help', items: [{ label: 'About Calculator', onClick: () => showDialog({ title: 'About Calculator', message: 'Calculator (clone)\nStandard mode with memory keys.', icon: 'info' }) }] },
  ];

  return (
    <div
      className="calculator"
      tabIndex={0}
      onKeyDown={(e) => {
        if (/^[0-9]$/.test(e.key)) dispatch({ type: 'digit', value: e.key });
        else if (KEYBOARD[e.key]) {
          e.preventDefault();
          dispatch(KEYBOARD[e.key]);
        }
      }}
    >
      <MenuBar menus={menus} />
      <div className="calc-display" aria-live="polite">{state.display}</div>
      <div className="calc-top">
        <span className="calc-mem">{state.memory !== 0 ? 'M' : ''}</span>
        <button type="button" className="calc-btn back" onClick={() => dispatch({ type: 'backspace' })}>Backspace</button>
        <button type="button" className="calc-btn ce" onClick={() => dispatch({ type: 'clearEntry' })}>CE</button>
        <button type="button" className="calc-btn c" onClick={() => dispatch({ type: 'clear' })}>C</button>
      </div>
      <div className="calc-grid">
        {ROWS.flat().map((k) => (
          <button key={k.label} type="button" className={`calc-btn ${k.cls ?? ''}`} onClick={() => dispatch(k.key)}>{k.label}</button>
        ))}
      </div>
    </div>
  );
}
