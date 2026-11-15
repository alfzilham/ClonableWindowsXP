/** Pure state machine for the standard calculator. */

export type Operator = '+' | '-' | '*' | '/';

export interface CalcState {
  display: string;
  /** Left operand waiting for the right one. */
  acc: number | null;
  op: Operator | null;
  /** True when the next digit should start a new number. */
  fresh: boolean;
  memory: number;
  error: boolean;
}

export type CalcKey =
  | { type: 'digit'; value: string }
  | { type: 'dot' }
  | { type: 'op'; value: Operator }
  | { type: 'equals' }
  | { type: 'clear' }
  | { type: 'clearEntry' }
  | { type: 'backspace' }
  | { type: 'negate' }
  | { type: 'sqrt' }
  | { type: 'percent' }
  | { type: 'reciprocal' }
  | { type: 'memory'; value: 'MC' | 'MR' | 'MS' | 'M+' };

export const initialCalc = (): CalcState => ({ display: '0', acc: null, op: null, fresh: true, memory: 0, error: false });

const MAX_DIGITS = 16;

export function compute(a: number, op: Operator, b: number): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b === 0 ? NaN : a / b;
  }
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return 'Cannot divide by zero';
  const rounded = Number(n.toPrecision(12));
  let s = String(rounded);
  if (s.includes('e')) s = rounded.toExponential(6);
  return s;
}

const errorState = (s: CalcState): CalcState => ({ ...s, display: 'Cannot divide by zero', acc: null, op: null, fresh: true, error: true });

export function press(state: CalcState, key: CalcKey): CalcState {
  if (state.error && key.type !== 'clear' && key.type !== 'memory') return state;
  switch (key.type) {
    case 'digit': {
      const base = state.fresh ? '' : state.display;
      const next = base === '0' ? key.value : base + key.value;
      if (next.replace(/[-.]/g, '').length > MAX_DIGITS) return state;
      return { ...state, display: next, fresh: false };
    }
    case 'dot': {
      if (state.fresh) return { ...state, display: '0.', fresh: false };
      return state.display.includes('.') ? state : { ...state, display: `${state.display}.` };
    }
    case 'op': {
      const current = Number(state.display);
      if (state.op && state.acc !== null && !state.fresh) {
        const result = compute(state.acc, state.op, current);
        if (Number.isNaN(result)) return errorState(state);
        return { ...state, display: formatNumber(result), acc: result, op: key.value, fresh: true };
      }
      return { ...state, acc: current, op: key.value, fresh: true };
    }
    case 'equals': {
      if (!state.op || state.acc === null) return { ...state, fresh: true };
      const result = compute(state.acc, state.op, Number(state.display));
      if (Number.isNaN(result)) return errorState(state);
      return { ...state, display: formatNumber(result), acc: null, op: null, fresh: true };
    }
    case 'clear':
      return { ...initialCalc(), memory: state.memory };
    case 'clearEntry':
      return { ...state, display: '0', fresh: true };
    case 'backspace': {
      if (state.fresh) return state;
      const next = state.display.length <= 1 || (state.display.length === 2 && state.display.startsWith('-')) ? '0' : state.display.slice(0, -1);
      return { ...state, display: next };
    }
    case 'negate': {
      if (state.display === '0') return state;
      return { ...state, display: state.display.startsWith('-') ? state.display.slice(1) : `-${state.display}` };
    }
    case 'sqrt': {
      const v = Number(state.display);
      if (v < 0) return { ...state, display: 'Invalid input', error: true, fresh: true, acc: null, op: null };
      return { ...state, display: formatNumber(Math.sqrt(v)), fresh: true };
    }
    case 'percent': {
      const v = Number(state.display);
      const base = state.acc ?? 0;
      return { ...state, display: formatNumber((base * v) / 100), fresh: true };
    }
    case 'reciprocal': {
      const v = Number(state.display);
      if (v === 0) return errorState(state);
      return { ...state, display: formatNumber(1 / v), fresh: true };
    }
    case 'memory': {
      const v = Number(state.display);
      switch (key.value) {
        case 'MC': return { ...state, memory: 0 };
        case 'MR': return state.error ? { ...state, error: false, display: formatNumber(state.memory), fresh: true } : { ...state, display: formatNumber(state.memory), fresh: true };
        case 'MS': return { ...state, memory: v, fresh: true };
        case 'M+': return { ...state, memory: state.memory + v, fresh: true };
      }
    }
  }
}
