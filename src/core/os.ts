import { APPS, type AppId } from './appMeta';
import { createStore } from './store';
import { setMuted, playError, playNotify } from './sound';

export const TASKBAR_HEIGHT = 30;
export const MIN_W = 180;
export const MIN_H = 110;

export type Phase = 'boot' | 'login' | 'desktop' | 'shutdown' | 'off';
export type ThemeColor = 'blue' | 'olive' | 'silver';
export type WallpaperId = 'bliss' | 'azul' | 'dusk' | 'solid';

export interface WindowState {
  id: string;
  appId: AppId;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  restore?: { x: number; y: number; width: number; height: number };
  props: Record<string, unknown>;
}

export type DialogIcon = 'error' | 'warning' | 'info';

export interface DialogState {
  id: string;
  title: string;
  message: string;
  icon: DialogIcon;
  buttons: string[];
  onClose?: (button: string) => void;
}

export interface Settings {
  themeColor: ThemeColor;
  wallpaper: WallpaperId;
  userName: string;
  muted: boolean;
}

export interface OSState extends Settings {
  phase: Phase;
  windows: WindowState[];
  activeId: string | null;
  zCounter: number;
  startOpen: boolean;
  dialogs: DialogState[];
}

const SETTINGS_KEY = 'xp.settings';

const DEFAULT_SETTINGS: Settings = { themeColor: 'blue', wallpaper: 'bliss', userName: 'User', muted: false };

function loadSettings(): Settings {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* ignore corrupted settings */
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

function initialState(): OSState {
  return {
    ...loadSettings(),
    phase: 'boot',
    windows: [],
    activeId: null,
    zCounter: 10,
    startOpen: false,
    dialogs: [],
  };
}

export const os = createStore<OSState>(initialState());
setMuted(os.get().muted);

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}${++idCounter}`;

/** Test helper: restore a pristine OS state. */
export function resetOS(overrides: Partial<OSState> = {}): void {
  idCounter = 0;
  os.set({ ...initialState(), ...DEFAULT_SETTINGS, phase: 'desktop', ...overrides });
}

// ---------- helpers ----------
function desktopSize(): { w: number; h: number } {
  if (typeof window === 'undefined') return { w: 1024, h: 768 - TASKBAR_HEIGHT };
  return { w: window.innerWidth, h: window.innerHeight - TASKBAR_HEIGHT };
}

function topVisible(windows: WindowState[], excludeId?: string): WindowState | undefined {
  return windows
    .filter((w) => !w.minimized && w.id !== excludeId)
    .sort((a, b) => b.z - a.z)[0];
}

function patchWindow(id: string, patch: Partial<WindowState>): void {
  os.set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
}

// ---------- phases & settings ----------
export function setPhase(phase: Phase): void {
  os.set({ phase, startOpen: false });
}

export function updateSettings(patch: Partial<Settings>): void {
  os.set(patch);
  const { themeColor, wallpaper, userName, muted } = os.get();
  setMuted(muted);
  saveSettings({ themeColor, wallpaper, userName, muted });
}

export function setStartOpen(open: boolean): void {
  os.set({ startOpen: open });
}

// ---------- windows ----------
export function openApp(appId: AppId, props: Record<string, unknown> = {}): string {
  const meta = APPS[appId];
  const state = os.get();
  if (meta.singleton) {
    const existing = state.windows.find((w) => w.appId === appId);
    if (existing) {
      focusWindow(existing.id);
      return existing.id;
    }
  }
  const { w: dw, h: dh } = desktopSize();
  const width = Math.min(meta.width, dw);
  const height = Math.min(meta.height, dh);
  const cascade = (state.windows.length % 8) * 28;
  const x = Math.max(0, Math.min(dw - width, Math.round((dw - width) / 2) - 60 + cascade));
  const y = Math.max(0, Math.min(dh - height, Math.round((dh - height) / 2) - 40 + cascade));
  const id = nextId('w');
  const z = state.zCounter + 1;
  const title = typeof props.title === 'string' ? props.title : meta.title;
  os.set({
    windows: [...state.windows, { id, appId, title, x, y, width, height, z, minimized: false, maximized: false, props }],
    activeId: id,
    zCounter: z,
    startOpen: false,
  });
  return id;
}

export function focusWindow(id: string): void {
  const state = os.get();
  const win = state.windows.find((w) => w.id === id);
  if (!win) return;
  if (state.activeId === id && !win.minimized) {
    if (state.startOpen) os.set({ startOpen: false });
    return;
  }
  const z = state.zCounter + 1;
  os.set({
    windows: state.windows.map((w) => (w.id === id ? { ...w, z, minimized: false } : w)),
    activeId: id,
    zCounter: z,
    startOpen: false,
  });
}

export function closeWindow(id: string): void {
  const state = os.get();
  const windows = state.windows.filter((w) => w.id !== id);
  const activeId = state.activeId === id ? (topVisible(windows)?.id ?? null) : state.activeId;
  os.set({ windows, activeId });
}

export function minimizeWindow(id: string): void {
  const state = os.get();
  const windows = state.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w));
  const activeId = state.activeId === id ? (topVisible(windows, id)?.id ?? null) : state.activeId;
  os.set({ windows, activeId });
}

export function toggleMaximize(id: string): void {
  const win = os.get().windows.find((w) => w.id === id);
  if (!win || APPS[win.appId].noMaximize) return;
  if (win.maximized) {
    patchWindow(id, { maximized: false, ...(win.restore ?? {}), restore: undefined });
  } else {
    patchWindow(id, {
      maximized: true,
      restore: { x: win.x, y: win.y, width: win.width, height: win.height },
    });
  }
  focusWindow(id);
}

export function toggleTaskbarWindow(id: string): void {
  const state = os.get();
  const win = state.windows.find((w) => w.id === id);
  if (!win) return;
  if (win.minimized || state.activeId !== id) focusWindow(id);
  else minimizeWindow(id);
}

export function setWindowBounds(id: string, bounds: { x: number; y: number; width: number; height: number }): void {
  const width = Math.max(MIN_W, bounds.width);
  const height = Math.max(MIN_H, bounds.height);
  patchWindow(id, { x: bounds.x, y: Math.max(0, bounds.y), width, height });
}

export function setWindowSize(id: string, width: number, height: number): void {
  patchWindow(id, { width, height });
}

export function setWindowTitle(id: string, title: string): void {
  patchWindow(id, { title });
}

export function showDesktop(): void {
  const state = os.get();
  const anyVisible = state.windows.some((w) => !w.minimized);
  os.set({
    windows: state.windows.map((w) => ({ ...w, minimized: anyVisible ? true : false })),
    activeId: anyVisible ? null : state.activeId,
  });
}

// ---------- dialogs ----------
export function showDialog(options: {
  title: string;
  message: string;
  icon?: DialogIcon;
  buttons?: string[];
  onClose?: (button: string) => void;
}): void {
  const icon = options.icon ?? 'info';
  if (icon === 'error') playError();
  else playNotify();
  const dialog: DialogState = {
    id: nextId('d'),
    title: options.title,
    message: options.message,
    icon,
    buttons: options.buttons ?? ['OK'],
    onClose: options.onClose,
  };
  os.set((s) => ({ dialogs: [...s.dialogs, dialog] }));
}

export function closeDialog(id: string, button: string): void {
  const dialog = os.get().dialogs.find((d) => d.id === id);
  os.set((s) => ({ dialogs: s.dialogs.filter((d) => d.id !== id) }));
  dialog?.onClose?.(button);
}
