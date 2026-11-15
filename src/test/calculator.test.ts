import { describe, expect, it } from 'vitest';
import { initialCalc, press, type CalcKey, type CalcState } from '../apps/calcLogic';

const run = (keys: (CalcKey | string)[], start: CalcState = initialCalc()): CalcState =>
  keys.reduce<CalcState>((s, k) => {
    if (typeof k !== 'string') return press(s, k);
    if (/^\d$/.test(k)) return press(s, { type: 'digit', value: k });
    if (k === '.') return press(s, { type: 'dot' });
    if (k === '=') return press(s, { type: 'equals' });
    return press(s, { type: 'op', value: k as '+' | '-' | '*' | '/' });
  }, start);

describe('calculator', () => {
  it('adds, subtracts, multiplies and divides', () => {
    expect(run(['1', '2', '+', '3', '=']).display).toBe('15');
    expect(run(['9', '-', '4', '=']).display).toBe('5');
    expect(run(['6', '*', '7', '=']).display).toBe('42');
    expect(run(['8', '/', '4', '=']).display).toBe('2');
  });

  it('chains operations left to right', () => {
    expect(run(['2', '+', '3', '*', '4', '=']).display).toBe('20');
  });

  it('avoids floating point noise', () => {
    expect(run(['0', '.', '1', '+', '0', '.', '2', '=']).display).toBe('0.3');
  });

  it('handles divide by zero until cleared', () => {
    const err = run(['5', '/', '0', '=']);
    expect(err.error).toBe(true);
    expect(press(err, { type: 'digit', value: '1' })).toBe(err);
    expect(press(err, { type: 'clear' }).display).toBe('0');
  });

  it('ignores a second decimal point and leading zeros', () => {
    expect(run(['0', '0', '5']).display).toBe('5');
    expect(run(['1', '.', '5', '.', '2']).display).toBe('1.52');
  });

  it('supports backspace, negate, sqrt, percent and reciprocal', () => {
    expect(press(run(['1', '2', '3']), { type: 'backspace' }).display).toBe('12');
    expect(press(run(['7']), { type: 'negate' }).display).toBe('-7');
    expect(press(run(['9', '6']), { type: 'sqrt' }).display).toBe('9.79795897113');
    expect(press(run(['2', '0', '0', '+', '5', '0']), { type: 'percent' }).display).toBe('100');
    expect(press(run(['4']), { type: 'reciprocal' }).display).toBe('0.25');
    expect(press(run(['4']), { type: 'sqrt' }).display).toBe('2');
  });

  it('memory keys store and recall', () => {
    let s = run(['5']);
    s = press(s, { type: 'memory', value: 'MS' });
    s = run(['9'], s);
    s = press(s, { type: 'memory', value: 'M+' });
    expect(s.memory).toBe(14);
    s = press(s, { type: 'memory', value: 'MR' });
    expect(s.display).toBe('14');
    s = press(s, { type: 'memory', value: 'MC' });
    expect(s.memory).toBe(0);
  });
});
