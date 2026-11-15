import { os, setPhase } from './os';
import { playLogoff } from './sound';

function clearSession(): void {
  os.set({ windows: [], activeId: null, dialogs: [], startOpen: false });
}

export function logOff(): void {
  playLogoff();
  clearSession();
  setPhase('login');
}

export function turnOff(): void {
  playLogoff();
  clearSession();
  setPhase('shutdown');
  window.setTimeout(() => {
    if (os.get().phase === 'shutdown') setPhase('off');
  }, 2600);
}

export function restart(): void {
  playLogoff();
  clearSession();
  setPhase('boot');
}
