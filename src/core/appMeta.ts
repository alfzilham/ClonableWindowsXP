import type { IconName } from '../components/Icon';

export type AppId =
  | 'explorer'
  | 'notepad'
  | 'paint'
  | 'calculator'
  | 'minesweeper'
  | 'solitaire'
  | 'iexplore'
  | 'mediaplayer'
  | 'cmd'
  | 'control'
  | 'display'
  | 'taskmgr'
  | 'about'
  | 'run';

export interface AppMeta {
  id: AppId;
  title: string;
  icon: IconName;
  width: number;
  height: number;
  /** Only one window of this app may exist at a time. */
  singleton?: boolean;
  resizable?: boolean;
  /** Hide the maximize button (dialog-like windows). */
  noMaximize?: boolean;
}

export const APPS: Record<AppId, AppMeta> = {
  explorer: { id: 'explorer', title: 'My Computer', icon: 'computer', width: 680, height: 460 },
  notepad: { id: 'notepad', title: 'Untitled - Notepad', icon: 'notepad', width: 560, height: 400 },
  paint: { id: 'paint', title: 'untitled - Paint', icon: 'paint', width: 720, height: 540 },
  calculator: { id: 'calculator', title: 'Calculator', icon: 'calculator', width: 262, height: 316, resizable: false, noMaximize: true },
  minesweeper: { id: 'minesweeper', title: 'Minesweeper', icon: 'mine', width: 190, height: 290, singleton: true, resizable: false, noMaximize: true },
  solitaire: { id: 'solitaire', title: 'Solitaire', icon: 'cards', width: 700, height: 520, singleton: true },
  iexplore: { id: 'iexplore', title: 'Internet Explorer', icon: 'ie', width: 760, height: 520 },
  mediaplayer: { id: 'mediaplayer', title: 'Windows Media Player', icon: 'media', width: 560, height: 420, singleton: true },
  cmd: { id: 'cmd', title: 'Command Prompt', icon: 'cmd', width: 640, height: 380 },
  control: { id: 'control', title: 'Control Panel', icon: 'control', width: 560, height: 400, singleton: true },
  display: { id: 'display', title: 'Display Properties', icon: 'display', width: 420, height: 470, singleton: true, resizable: false, noMaximize: true },
  taskmgr: { id: 'taskmgr', title: 'Windows Task Manager', icon: 'taskmgr', width: 420, height: 400, singleton: true },
  about: { id: 'about', title: 'About Windows', icon: 'windows', width: 400, height: 330, singleton: true, resizable: false, noMaximize: true },
  run: { id: 'run', title: 'Run', icon: 'run', width: 390, height: 190, singleton: true, resizable: false, noMaximize: true },
};

const RUN_ALIASES: Record<string, AppId> = {
  explorer: 'explorer',
  'explorer.exe': 'explorer',
  notepad: 'notepad',
  'notepad.exe': 'notepad',
  mspaint: 'paint',
  'mspaint.exe': 'paint',
  paint: 'paint',
  calc: 'calculator',
  'calc.exe': 'calculator',
  winmine: 'minesweeper',
  'winmine.exe': 'minesweeper',
  minesweeper: 'minesweeper',
  sol: 'solitaire',
  'sol.exe': 'solitaire',
  solitaire: 'solitaire',
  iexplore: 'iexplore',
  'iexplore.exe': 'iexplore',
  wmplayer: 'mediaplayer',
  'wmplayer.exe': 'mediaplayer',
  cmd: 'cmd',
  'cmd.exe': 'cmd',
  control: 'control',
  'control.exe': 'control',
  taskmgr: 'taskmgr',
  'taskmgr.exe': 'taskmgr',
  winver: 'about',
  'winver.exe': 'about',
  desk: 'display',
  'desk.cpl': 'display',
};

/** Map a Run-dialog / command-prompt string to an app, or null if unknown. */
export function resolveRunCommand(input: string): AppId | null {
  return RUN_ALIASES[input.trim().toLowerCase()] ?? null;
}
