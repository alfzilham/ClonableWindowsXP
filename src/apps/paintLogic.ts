/** Pure helpers for Paint, kept free of DOM types so they can be unit tested. */

export type RGBA = [number, number, number, number];

export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export function parseColor(hex: string): RGBA {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

function pixelAt(buf: PixelBuffer, x: number, y: number): RGBA {
  const i = (y * buf.width + x) * 4;
  return [buf.data[i], buf.data[i + 1], buf.data[i + 2], buf.data[i + 3]];
}

const same = (a: RGBA, b: RGBA) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];

/** Scanline flood fill; returns the number of pixels changed. */
export function floodFill(buf: PixelBuffer, startX: number, startY: number, color: RGBA): number {
  const { width, height, data } = buf;
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) return 0;
  const target = pixelAt(buf, startX, startY);
  if (same(target, color)) return 0;
  let changed = 0;
  const stack: [number, number][] = [[startX, startY]];
  const paint = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    data[i] = color[0];
    data[i + 1] = color[1];
    data[i + 2] = color[2];
    data[i + 3] = color[3];
    changed++;
  };
  while (stack.length) {
    const [x, y] = stack.pop() as [number, number];
    let left = x;
    while (left >= 0 && same(pixelAt(buf, left, y), target)) left--;
    left++;
    let aboveOpen = false;
    let belowOpen = false;
    for (let cx = left; cx < width && same(pixelAt(buf, cx, y), target); cx++) {
      paint(cx, y);
      if (y > 0) {
        const match = same(pixelAt(buf, cx, y - 1), target);
        if (match && !aboveOpen) stack.push([cx, y - 1]);
        aboveOpen = match;
      }
      if (y < height - 1) {
        const match = same(pixelAt(buf, cx, y + 1), target);
        if (match && !belowOpen) stack.push([cx, y + 1]);
        belowOpen = match;
      }
    }
  }
  return changed;
}

export function invertColors(buf: PixelBuffer): void {
  for (let i = 0; i < buf.data.length; i += 4) {
    buf.data[i] = 255 - buf.data[i];
    buf.data[i + 1] = 255 - buf.data[i + 1];
    buf.data[i + 2] = 255 - buf.data[i + 2];
  }
}

export const PALETTE: string[] = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080ff', '#004080', '#4000ff', '#804000',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040',
];
