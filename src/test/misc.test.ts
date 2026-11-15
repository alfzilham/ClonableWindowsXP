import { describe, expect, it } from 'vitest';
import { PALETTE, floodFill, invertColors, parseColor, type PixelBuffer } from '../apps/paintLogic';
import { HOME, normalizeUrl } from '../apps/urlLogic';
import { synthesizeDemoWav } from '../core/wav';
import { createStore } from '../core/store';

const blank = (w: number, h: number): PixelBuffer => {
  const data = new Uint8ClampedArray(w * h * 4);
  data.fill(255);
  return { data, width: w, height: h };
};
const px = (b: PixelBuffer, x: number, y: number) => Array.from(b.data.slice((y * b.width + x) * 4, (y * b.width + x) * 4 + 4));

describe('paint helpers', () => {
  it('parses colours', () => {
    expect(parseColor('#ff8000')).toEqual([255, 128, 0, 255]);
    expect(parseColor('#fff')).toEqual([255, 255, 255, 255]);
    expect(PALETTE).toHaveLength(28);
  });

  it('flood fills only the connected region', () => {
    const b = blank(5, 5);
    // vertical wall at x=2
    for (let y = 0; y < 5; y++) b.data.set([0, 0, 0, 255], (y * 5 + 2) * 4);
    const changed = floodFill(b, 0, 0, [255, 0, 0, 255]);
    expect(changed).toBe(10);
    expect(px(b, 1, 4)).toEqual([255, 0, 0, 255]);
    expect(px(b, 4, 0)).toEqual([255, 255, 255, 255]);
    expect(px(b, 2, 2)).toEqual([0, 0, 0, 255]);
  });

  it('does nothing when filling with the same colour or out of range', () => {
    const b = blank(3, 3);
    expect(floodFill(b, 0, 0, [255, 255, 255, 255])).toBe(0);
    expect(floodFill(b, 9, 9, [0, 0, 0, 255])).toBe(0);
  });

  it('inverts colours but keeps alpha', () => {
    const b = blank(1, 1);
    b.data.set([10, 20, 30, 200]);
    invertColors(b);
    expect(px(b, 0, 0)).toEqual([245, 235, 225, 200]);
  });
});

describe('url normalisation', () => {
  it('handles urls, hosts and searches', () => {
    expect(normalizeUrl('')).toBe(HOME);
    expect(normalizeUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(normalizeUrl('example.com/path?x=1')).toBe('https://example.com/path?x=1');
    expect(normalizeUrl('windows xp')).toBe('https://www.bing.com/search?q=windows%20xp');
  });
});

describe('wav synth', () => {
  it('produces a valid PCM header and non-silent audio', () => {
    const wav = synthesizeDemoWav(8000);
    const view = new DataView(wav.buffer);
    const text = (o: number) => String.fromCharCode(...wav.slice(o, o + 4));
    expect(text(0)).toBe('RIFF');
    expect(text(8)).toBe('WAVE');
    expect(view.getUint32(24, true)).toBe(8000);
    expect(view.getUint32(40, true)).toBe(wav.length - 44);
    let peak = 0;
    for (let i = 44; i < wav.length; i += 2) peak = Math.max(peak, Math.abs(view.getInt16(i, true)));
    expect(peak).toBeGreaterThan(1000);
  });
});

describe('store', () => {
  it('notifies subscribers on change and supports updater functions', () => {
    const store = createStore({ n: 0 });
    let calls = 0;
    const off = store.subscribe(() => calls++);
    store.set({ n: 1 });
    store.set((s) => ({ n: s.n + 1 }));
    expect(store.get().n).toBe(2);
    expect(calls).toBe(2);
    off();
    store.set({ n: 5 });
    expect(calls).toBe(2);
  });
});
