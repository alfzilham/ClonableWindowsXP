import { useState } from 'react';
import { APPS, type AppId } from '../core/appMeta';
import { IDS } from '../core/vfs';
import { openApp, os } from '../core/os';
import { useStore } from '../core/store';
import { logOff } from '../core/power';
import { Icon, type IconName } from './Icon';

interface StartMenuProps {
  onTurnOff: () => void;
}

interface Entry {
  label: string;
  sub?: string;
  icon: IconName;
  run: () => void;
}

const app = (id: AppId, sub?: string, props: Record<string, unknown> = {}): Entry => ({
  label: APPS[id].title,
  sub,
  icon: APPS[id].icon,
  run: () => openApp(id, props),
});

const PINNED: Entry[] = [
  { ...app('iexplore', 'Internet'), label: 'Internet Explorer' },
  { ...app('notepad', 'Edit text'), label: 'Notepad' },
  { ...app('paint'), label: 'Paint' },
  { ...app('mediaplayer'), label: 'Windows Media Player' },
  { ...app('minesweeper'), label: 'Minesweeper' },
  { ...app('solitaire'), label: 'Solitaire' },
  { ...app('calculator'), label: 'Calculator' },
  { ...app('cmd'), label: 'Command Prompt' },
];

const PROGRAMS: { group: string; items: Entry[] }[] = [
  { group: 'Accessories', items: [{ ...app('notepad'), label: 'Notepad' }, { ...app('paint'), label: 'Paint' }, { ...app('calculator'), label: 'Calculator' }, { ...app('cmd'), label: 'Command Prompt' }, { ...app('explorer', undefined, { dirId: IDS.root }), label: 'Windows Explorer' }, { ...app('taskmgr'), label: 'Task Manager' }] },
  { group: 'Games', items: [{ ...app('minesweeper'), label: 'Minesweeper' }, { ...app('solitaire'), label: 'Solitaire' }] },
  { group: '', items: [{ ...app('iexplore'), label: 'Internet Explorer' }, { ...app('mediaplayer'), label: 'Windows Media Player' }] },
];

const PLACES: Entry[] = [
  { label: 'My Documents', icon: 'folder', run: () => openApp('explorer', { dirId: IDS.docs }) },
  { label: 'My Pictures', icon: 'image', run: () => openApp('explorer', { dirId: IDS.pictures }) },
  { label: 'My Music', icon: 'music', run: () => openApp('explorer', { dirId: IDS.music }) },
  { label: 'My Computer', icon: 'computer', run: () => openApp('explorer', { dirId: IDS.root }) },
];

export function StartMenu({ onTurnOff }: StartMenuProps) {
  const userName = useStore(os, (s) => s.userName);
  const [programsOpen, setProgramsOpen] = useState(false);

  return (
    <div className="start-menu" onContextMenu={(e) => e.preventDefault()}>
      <div className="start-header">
        <span className="start-avatar"><Icon name="user" size={40} /></span>
        <span className="start-username">{userName}</span>
      </div>
      <div className="start-body">
        <div className="start-left">
          {PINNED.map((e) => (
            <button key={e.label} type="button" className="start-item big" onClick={e.run}>
              <Icon name={e.icon} size={30} />
              <span><b>{e.label}</b>{e.sub && <small>{e.sub}</small>}</span>
            </button>
          ))}
          <div className="start-sep" />
          <div className="start-programs-slot" onPointerEnter={() => setProgramsOpen(true)} onPointerLeave={() => setProgramsOpen(false)}>
            <button type="button" className="start-item all-programs" onClick={() => setProgramsOpen((v) => !v)}>
              <b>All Programs</b>
              <span className="start-arrow">{'▶'}</span>
            </button>
            {programsOpen && (
              <div className="programs-flyout">
                {PROGRAMS.map((g) => (
                  <div key={g.group || 'misc'}>
                    {g.group && <div className="flyout-group">{g.group}</div>}
                    {g.items.map((e) => (
                      <button key={e.label} type="button" className="start-item" onClick={e.run}>
                        <Icon name={e.icon} size={20} />
                        <span>{e.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="start-right">
          {PLACES.map((e) => (
            <button key={e.label} type="button" className="start-item right" onClick={e.run}>
              <Icon name={e.icon} size={22} />
              <b>{e.label}</b>
            </button>
          ))}
          <div className="start-sep" />
          <button type="button" className="start-item right" onClick={() => openApp('control')}>
            <Icon name="control" size={22} /><span>Control Panel</span>
          </button>
          <button type="button" className="start-item right" onClick={() => openApp('about')}>
            <Icon name="help" size={22} /><span>Help and Support</span>
          </button>
          <button type="button" className="start-item right" onClick={() => openApp('run')}>
            <Icon name="run" size={22} /><span>Run...</span>
          </button>
        </div>
      </div>
      <div className="start-footer">
        <button type="button" className="start-foot-btn" onClick={logOff}>
          <Icon name="logoff" size={22} /> Log Off
        </button>
        <button type="button" className="start-foot-btn" onClick={onTurnOff}>
          <Icon name="power" size={22} /> Turn Off Computer
        </button>
      </div>
    </div>
  );
}
