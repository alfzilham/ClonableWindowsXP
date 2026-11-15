import { useState } from 'react';
import { APPS, resolveRunCommand } from '../core/appMeta';
import { closeWindow, focusWindow, openApp, os, showDialog, updateSettings, type ThemeColor, type WallpaperId } from '../core/os';
import { useStore } from '../core/store';
import { IDS, resetVfs, vfs } from '../core/vfs';
import { Icon, type IconName } from '../components/Icon';
import type { AppProps } from './types';

/* ---------------- About Windows ---------------- */
export function About({ windowId }: AppProps) {
  return (
    <div className="about">
      <div className="about-banner"><Icon name="windows" size={48} /><div><b>Windows</b><sup>xp</sup><small>Clone Edition</small></div></div>
      <div className="about-body">
        <p><b>Windows XP Clone</b><br />Version 2.0 (React + TypeScript)</p>
        <p>A fan-made recreation of the classic desktop, built for nostalgia. It runs entirely in your browser; files are stored locally in IndexedDB.</p>
        <p>This project is not affiliated with or endorsed by Microsoft.</p>
        <p>Registered to: <b>{os.get().userName}</b></p>
      </div>
      <div className="dialog-buttons"><button type="button" className="xp-button" onClick={() => closeWindow(windowId)}>OK</button></div>
    </div>
  );
}

/* ---------------- Run ---------------- */
export function RunDialog({ windowId }: AppProps) {
  const [value, setValue] = useState('');

  const run = () => {
    const text = value.trim();
    if (!text) return;
    const appId = resolveRunCommand(text);
    if (appId) {
      closeWindow(windowId);
      openApp(appId);
      return;
    }
    if (/^https?:\/\//i.test(text) || /^www\./i.test(text)) {
      closeWindow(windowId);
      openApp('iexplore', { url: text });
      return;
    }
    const node = vfs.resolve(text, IDS.c);
    if (node && node.type === 'dir') {
      closeWindow(windowId);
      openApp('explorer', { dirId: node.id });
      return;
    }
    showDialog({ title: text, message: `Windows cannot find '${text}'. Make sure you typed the name correctly, and then try again.`, icon: 'error' });
  };

  return (
    <div className="run-dialog">
      <div className="run-head">
        <Icon name="run" size={32} />
        <p>Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.</p>
      </div>
      <div className="run-row">
        <label htmlFor="run-input">Open:</label>
        <input id="run-input" className="xp-input" value={value} autoFocus onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} />
      </div>
      <div className="dialog-buttons">
        <button type="button" className="xp-button" onClick={run}>OK</button>
        <button type="button" className="xp-button" onClick={() => closeWindow(windowId)}>Cancel</button>
      </div>
    </div>
  );
}

/* ---------------- Task Manager ---------------- */
export function TaskManager(_: AppProps) {
  const windows = useStore(os, (s) => s.windows);
  const [selected, setSelected] = useState<string | null>(null);
  const sel = windows.find((w) => w.id === selected);
  return (
    <div className="taskmgr">
      <div className="tm-tabs"><span className="tm-tab on">Applications</span></div>
      <div className="tm-table">
        <div className="tm-head"><span>Task</span><span>Status</span></div>
        {windows.length === 0 && <div className="list-empty">No running applications.</div>}
        {windows.map((w) => (
          <button key={w.id} type="button" className={`tm-row${selected === w.id ? ' selected' : ''}`} onClick={() => setSelected(w.id)} onDoubleClick={() => focusWindow(w.id)}>
            <span><Icon name={APPS[w.appId].icon} size={16} /> {w.title}</span>
            <span>{w.minimized ? 'Minimized' : 'Running'}</span>
          </button>
        ))}
      </div>
      <div className="dialog-buttons">
        <button type="button" className="xp-button" disabled={!sel} onClick={() => sel && closeWindow(sel.id)}>End Task</button>
        <button type="button" className="xp-button" disabled={!sel} onClick={() => sel && focusWindow(sel.id)}>Switch To</button>
        <button type="button" className="xp-button" onClick={() => openApp('run')}>New Task...</button>
      </div>
      <div className="statusbar"><span>Processes: {windows.length}</span></div>
    </div>
  );
}

/* ---------------- Display Properties ---------------- */
const WALLPAPERS: { id: WallpaperId; label: string }[] = [
  { id: 'bliss', label: 'Bliss' },
  { id: 'azul', label: 'Azure' },
  { id: 'dusk', label: 'Dusk' },
  { id: 'solid', label: '(None)' },
];

const THEMES: { id: ThemeColor; label: string }[] = [
  { id: 'blue', label: 'Default (blue)' },
  { id: 'olive', label: 'Olive Green' },
  { id: 'silver', label: 'Silver' },
];

export function DisplayProperties({ windowId }: AppProps) {
  const current = os.get();
  const [tab, setTab] = useState<'themes' | 'desktop'>('themes');
  const [theme, setTheme] = useState(current.themeColor);
  const [wallpaper, setWallpaper] = useState(current.wallpaper);

  const apply = () => updateSettings({ themeColor: theme, wallpaper });

  return (
    <div className="display-props">
      <div className="tabs">
        <button type="button" className={`tab${tab === 'themes' ? ' on' : ''}`} onClick={() => setTab('themes')}>Themes</button>
        <button type="button" className={`tab${tab === 'desktop' ? ' on' : ''}`} onClick={() => setTab('desktop')}>Desktop</button>
      </div>
      <div className="tab-panel">
        <div className={`monitor wallpaper-${wallpaper}`} data-theme={theme}>
          <div className="mini-window"><div className="mini-title" /><div className="mini-body" /></div>
          <div className="mini-taskbar" />
        </div>
        {tab === 'themes' ? (
          <fieldset>
            <legend>Color scheme:</legend>
            {THEMES.map((t) => (
              <label key={t.id} className="radio"><input type="radio" name="theme" checked={theme === t.id} onChange={() => setTheme(t.id)} /> {t.label}</label>
            ))}
          </fieldset>
        ) : (
          <fieldset>
            <legend>Background:</legend>
            {WALLPAPERS.map((w) => (
              <label key={w.id} className="radio"><input type="radio" name="wp" checked={wallpaper === w.id} onChange={() => setWallpaper(w.id)} /> {w.label}</label>
            ))}
          </fieldset>
        )}
      </div>
      <div className="dialog-buttons">
        <button type="button" className="xp-button" onClick={() => { apply(); closeWindow(windowId); }}>OK</button>
        <button type="button" className="xp-button" onClick={() => closeWindow(windowId)}>Cancel</button>
        <button type="button" className="xp-button" onClick={apply}>Apply</button>
      </div>
    </div>
  );
}

/* ---------------- Control Panel ---------------- */
interface CpItem {
  label: string;
  icon: IconName;
  run: () => void;
}

export function ControlPanel(_: AppProps) {
  const muted = useStore(os, (s) => s.muted);
  const userName = useStore(os, (s) => s.userName);
  const [editing, setEditing] = useState(false);

  const items: CpItem[] = [
    { label: 'Display', icon: 'display', run: () => openApp('display') },
    { label: muted ? 'Sounds: Off' : 'Sounds: On', icon: 'sound', run: () => updateSettings({ muted: !muted }) },
    { label: 'User Accounts', icon: 'user', run: () => setEditing(true) },
    { label: 'System', icon: 'computer', run: () => openApp('about') },
    { label: 'Task Manager', icon: 'taskmgr', run: () => openApp('taskmgr') },
    {
      label: 'Reset Virtual Disk',
      icon: 'recycle',
      run: () => showDialog({
        title: 'Reset Virtual Disk',
        message: 'This deletes every file you created and restores the default folders. Continue?',
        icon: 'warning',
        buttons: ['Yes', 'No'],
        onClose: (b) => b === 'Yes' && resetVfs(),
      }),
    },
  ];

  return (
    <div className="control-panel">
      <div className="cp-side"><h4>Control Panel</h4><p>Pick a category to change how your computer looks and behaves.</p></div>
      <div className="cp-main">
        <div className="cp-grid">
          {items.map((it) => (
            <button key={it.label} type="button" className="cp-item" onClick={it.run}>
              <Icon name={it.icon} size={32} />
              <span>{it.label}</span>
            </button>
          ))}
        </div>
        {editing && (
          <form
            className="cp-form"
            onSubmit={(e) => {
              e.preventDefault();
              const name = String(new FormData(e.currentTarget).get('name') ?? '').trim();
              if (name) updateSettings({ userName: name.slice(0, 24) });
              setEditing(false);
            }}
          >
            <label htmlFor="cp-name">Account name:</label>
            <input id="cp-name" name="name" className="xp-input" defaultValue={userName} autoFocus maxLength={24} />
            <button type="submit" className="xp-button">Change</button>
            <button type="button" className="xp-button" onClick={() => setEditing(false)}>Cancel</button>
          </form>
        )}
      </div>
    </div>
  );
}
