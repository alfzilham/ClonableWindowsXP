import { useEffect, useState } from 'react';
import { APPS } from '../core/appMeta';
import {
  closeWindow,
  minimizeWindow,
  openApp,
  os,
  setStartOpen,
  showDesktop,
  toggleMaximize,
  toggleTaskbarWindow,
  updateSettings,
  focusWindow,
} from '../core/os';
import { useStore } from '../core/store';
import { restart, turnOff } from '../core/power';
import { Icon } from './Icon';
import { StartMenu } from './StartMenu';
import { useContextMenu } from './ContextMenu';

function useClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

interface TurnOffDialogProps {
  onCancel: () => void;
}

function TurnOffDialog({ onCancel }: TurnOffDialogProps) {
  return (
    <div className="modal-scrim">
      <div className="turnoff">
        <div className="turnoff-head">Turn off computer</div>
        <div className="turnoff-body">
          <button type="button" className="turnoff-choice" onClick={onCancel}>
            <span className="turnoff-icon standby"><Icon name="computer" size={30} /></span>
            Stand By
          </button>
          <button type="button" className="turnoff-choice" onClick={turnOff}>
            <span className="turnoff-icon off"><Icon name="power" size={30} /></span>
            Turn Off
          </button>
          <button type="button" className="turnoff-choice" onClick={restart}>
            <span className="turnoff-icon restart"><Icon name="logoff" size={30} /></span>
            Restart
          </button>
        </div>
        <div className="turnoff-foot">
          <button type="button" className="xp-button" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export function Taskbar() {
  const windows = useStore(os, (s) => s.windows);
  const activeId = useStore(os, (s) => s.activeId);
  const startOpen = useStore(os, (s) => s.startOpen);
  const muted = useStore(os, (s) => s.muted);
  const now = useClock();
  const [turnOffOpen, setTurnOffOpen] = useState(false);
  const ctx = useContextMenu();

  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const fullDate = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <>
      {startOpen && <StartMenu onTurnOff={() => { setStartOpen(false); setTurnOffOpen(true); }} />}
      <div className="taskbar" onContextMenu={(e) => e.preventDefault()}>
        <button
          type="button"
          className={`start-button${startOpen ? ' pressed' : ''}`}
          onClick={() => setStartOpen(!startOpen)}
          aria-label="Start"
        >
          <Icon name="windows" size={20} />
          <span>start</span>
        </button>
        <div className="quick-launch">
          <button type="button" className="ql-btn" title="Show Desktop" onClick={showDesktop}>
            <Icon name="display" size={18} />
          </button>
          <button type="button" className="ql-btn" title="Internet Explorer" onClick={() => openApp('iexplore')}>
            <Icon name="ie" size={18} />
          </button>
          <button type="button" className="ql-btn" title="Windows Media Player" onClick={() => openApp('mediaplayer')}>
            <Icon name="media" size={18} />
          </button>
        </div>
        <div className="task-list">
          {windows.map((w) => {
            const isActive = w.id === activeId && !w.minimized;
            return (
              <button
                key={w.id}
                type="button"
                className={`task-button${isActive ? ' active' : ''}`}
                title={w.title}
                onClick={() => toggleTaskbarWindow(w.id)}
                onContextMenu={(e) =>
                  ctx.open(e, [
                    { label: 'Restore', disabled: !w.minimized && !w.maximized, onClick: () => (w.minimized ? focusWindow(w.id) : toggleMaximize(w.id)) },
                    { label: 'Minimize', disabled: w.minimized, onClick: () => minimizeWindow(w.id) },
                    { label: 'Maximize', disabled: w.maximized || !!APPS[w.appId].noMaximize, onClick: () => toggleMaximize(w.id) },
                    { separator: true },
                    { label: 'Close', bold: true, onClick: () => closeWindow(w.id) },
                  ])
                }
              >
                <Icon name={APPS[w.appId].icon} size={16} />
                <span className="task-label">{w.title}</span>
              </button>
            );
          })}
        </div>
        <div className="tray">
          <button
            type="button"
            className="tray-icon"
            title={muted ? 'Volume: muted (click to unmute)' : 'Volume (click to mute)'}
            onClick={() => updateSettings({ muted: !muted })}
          >
            <Icon name="sound" size={16} />
            {muted && <span className="tray-slash" />}
          </button>
          <button type="button" className="tray-clock" title={fullDate} onDoubleClick={() => openApp('control')}>
            {time}
          </button>
        </div>
      </div>
      {ctx.element}
      {turnOffOpen && <TurnOffDialog onCancel={() => setTurnOffOpen(false)} />}
    </>
  );
}
