import type { ComponentType } from 'react';
import type { AppId } from '../core/appMeta';
import { Calculator } from './Calculator';
import { CommandPrompt } from './CommandPrompt';
import { Explorer } from './Explorer';
import { InternetExplorer } from './InternetExplorer';
import { MediaPlayer } from './MediaPlayer';
import { Minesweeper } from './Minesweeper';
import { Notepad } from './Notepad';
import { Paint } from './Paint';
import { Solitaire } from './Solitaire';
import { About, ControlPanel, DisplayProperties, RunDialog, TaskManager } from './SystemApps';
import type { AppProps } from './types';

/** Maps every AppId to its component. Metadata (size, icon...) lives in core/appMeta. */
export const APP_COMPONENTS: Record<AppId, ComponentType<AppProps>> = {
  explorer: Explorer,
  notepad: Notepad,
  paint: Paint,
  calculator: Calculator,
  minesweeper: Minesweeper,
  solitaire: Solitaire,
  iexplore: InternetExplorer,
  mediaplayer: MediaPlayer,
  cmd: CommandPrompt,
  control: ControlPanel,
  display: DisplayProperties,
  taskmgr: TaskManager,
  about: About,
  run: RunDialog,
};
