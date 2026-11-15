import { beforeEach, describe, expect, it } from 'vitest';
import {
  closeDialog,
  closeWindow,
  focusWindow,
  minimizeWindow,
  openApp,
  os,
  resetOS,
  setWindowBounds,
  showDesktop,
  showDialog,
  toggleMaximize,
  toggleTaskbarWindow,
} from '../core/os';
import { resolveRunCommand } from '../core/appMeta';

beforeEach(() => resetOS());

describe('window manager', () => {
  it('opens windows and focuses the newest', () => {
    const a = openApp('notepad');
    const b = openApp('calculator');
    expect(os.get().windows).toHaveLength(2);
    expect(os.get().activeId).toBe(b);
    focusWindow(a);
    const [wa, wb] = [a, b].map((id) => os.get().windows.find((w) => w.id === id)!);
    expect(os.get().activeId).toBe(a);
    expect(wa.z).toBeGreaterThan(wb.z);
  });

  it('reuses singleton apps', () => {
    const first = openApp('minesweeper');
    const second = openApp('minesweeper');
    expect(second).toBe(first);
    expect(os.get().windows).toHaveLength(1);
  });

  it('restores a minimized singleton instead of duplicating it', () => {
    const id = openApp('solitaire');
    minimizeWindow(id);
    expect(openApp('solitaire')).toBe(id);
    expect(os.get().windows[0].minimized).toBe(false);
  });

  it('minimizing activates the next window; closing removes it', () => {
    const a = openApp('notepad');
    const b = openApp('paint');
    minimizeWindow(b);
    expect(os.get().activeId).toBe(a);
    closeWindow(a);
    expect(os.get().windows.map((w) => w.id)).toEqual([b]);
    expect(os.get().activeId).toBeNull();
  });

  it('toggles maximize and restores the previous bounds', () => {
    const id = openApp('notepad');
    const before = { ...os.get().windows[0] };
    toggleMaximize(id);
    expect(os.get().windows[0].maximized).toBe(true);
    toggleMaximize(id);
    const after = os.get().windows[0];
    expect(after.maximized).toBe(false);
    expect([after.x, after.y, after.width, after.height]).toEqual([before.x, before.y, before.width, before.height]);
  });

  it('does not maximize dialog-like apps', () => {
    const id = openApp('calculator');
    toggleMaximize(id);
    expect(os.get().windows[0].maximized).toBe(false);
  });

  it('taskbar click minimizes the active window and restores it again', () => {
    const id = openApp('notepad');
    toggleTaskbarWindow(id);
    expect(os.get().windows[0].minimized).toBe(true);
    toggleTaskbarWindow(id);
    expect(os.get().windows[0].minimized).toBe(false);
    expect(os.get().activeId).toBe(id);
  });

  it('clamps window size and keeps the title bar on screen', () => {
    const id = openApp('notepad');
    setWindowBounds(id, { x: 10, y: -50, width: 20, height: 20 });
    const w = os.get().windows[0];
    expect(w.y).toBe(0);
    expect(w.width).toBeGreaterThan(100);
    expect(w.height).toBeGreaterThan(50);
  });

  it('show desktop minimizes everything, then restores', () => {
    openApp('notepad');
    openApp('paint');
    showDesktop();
    expect(os.get().windows.every((w) => w.minimized)).toBe(true);
    showDesktop();
    expect(os.get().windows.every((w) => !w.minimized)).toBe(true);
  });

  it('passes launch props and a custom title', () => {
    openApp('notepad', { fileId: 'welcome', title: 'Custom' });
    expect(os.get().windows[0].props.fileId).toBe('welcome');
    expect(os.get().windows[0].title).toBe('Custom');
  });
});

describe('dialogs', () => {
  it('queues dialogs and reports the clicked button', () => {
    let clicked = '';
    showDialog({ title: 'T', message: 'M', buttons: ['Yes', 'No'], onClose: (b) => (clicked = b) });
    const [d] = os.get().dialogs;
    expect(d.buttons).toEqual(['Yes', 'No']);
    closeDialog(d.id, 'No');
    expect(clicked).toBe('No');
    expect(os.get().dialogs).toHaveLength(0);
  });
});

describe('run command aliases', () => {
  it('maps names regardless of case and extension', () => {
    expect(resolveRunCommand('NOTEPAD.EXE')).toBe('notepad');
    expect(resolveRunCommand(' mspaint ')).toBe('paint');
    expect(resolveRunCommand('winmine')).toBe('minesweeper');
    expect(resolveRunCommand('unknown')).toBeNull();
  });
});
