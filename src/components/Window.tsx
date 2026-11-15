import { memo, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { APPS } from '../core/appMeta';
import {
  MIN_H,
  MIN_W,
  TASKBAR_HEIGHT,
  closeWindow,
  focusWindow,
  minimizeWindow,
  setWindowBounds,
  toggleMaximize,
  type WindowState,
} from '../core/os';
import { APP_COMPONENTS } from '../apps/registry';
import { Icon } from './Icon';

interface WindowProps {
  win: WindowState;
  active: boolean;
}

const HANDLES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const;

function WindowImpl({ win, active }: WindowProps) {
  const meta = APPS[win.appId];
  const [interacting, setInteracting] = useState(false);
  const AppComponent = APP_COMPONENTS[win.appId];
  const resizable = meta.resizable !== false && !win.maximized;

  const track = (onMove: (dx: number, dy: number) => void, startX: number, startY: number) => {
    setInteracting(true);
    const move = (ev: PointerEvent) => onMove(ev.clientX - startX, ev.clientY - startY);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setInteracting(false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('.title-btn')) return;
    focusWindow(win.id);
    if (win.maximized) return;
    e.preventDefault();
    const { x, y, width, height } = win;
    const maxY = window.innerHeight - TASKBAR_HEIGHT - 24;
    track(
      (dx, dy) => setWindowBounds(win.id, { x: x + dx, y: Math.min(y + dy, maxY), width, height }),
      e.clientX,
      e.clientY,
    );
  };

  const startResize = (dir: (typeof HANDLES)[number]) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    focusWindow(win.id);
    const { x, y, width, height } = win;
    track((dx, dy) => {
      let nx = x;
      let ny = y;
      let nw = width;
      let nh = height;
      if (dir.includes('e')) nw = Math.max(MIN_W, width + dx);
      if (dir.includes('s')) nh = Math.max(MIN_H, height + dy);
      if (dir.includes('w')) {
        nw = Math.max(MIN_W, width - dx);
        nx = x + (width - nw);
      }
      if (dir.includes('n')) {
        nh = Math.max(MIN_H, height - dy);
        ny = y + (height - nh);
      }
      setWindowBounds(win.id, { x: nx, y: ny, width: nw, height: nh });
    }, e.clientX, e.clientY);
  };

  const className = ['window', active ? 'active' : 'inactive', win.maximized ? 'maximized' : '', interacting ? 'interacting' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      role="dialog"
      aria-label={win.title}
      style={{
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.z,
        display: win.minimized ? 'none' : undefined,
      }}
      onPointerDownCapture={() => focusWindow(win.id)}
    >
      <div className="titlebar" onPointerDown={startDrag} onDoubleClick={() => meta.noMaximize || toggleMaximize(win.id)}>
        <Icon name={meta.icon} size={16} className="title-icon" />
        <span className="title-text">{win.title}</span>
        <button type="button" className="title-btn" aria-label="Minimize" onClick={() => minimizeWindow(win.id)}>
          <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="7" width="6" height="2" fill="#fff" /></svg>
        </button>
        {!meta.noMaximize && (
          <button type="button" className="title-btn" aria-label={win.maximized ? 'Restore' : 'Maximize'} onClick={() => toggleMaximize(win.id)}>
            {win.maximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff">
                <rect x="1.500" y="3.500" width="5" height="5" />
                <path d="M3.500 3.500V1.500h5v5h-2" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.500">
                <rect x="1.500" y="1.500" width="7" height="7" />
                <path d="M1 2.200h8" strokeWidth="2.400" />
              </svg>
            )}
          </button>
        )}
        <button type="button" className="title-btn close" aria-label="Close" onClick={() => closeWindow(win.id)}>
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.500 1.500l7 7M8.500 1.500l-7 7" stroke="#fff" strokeWidth="1.800" /></svg>
        </button>
      </div>
      <div className="window-body">
        <AppComponent windowId={win.id} props={win.props} />
      </div>
      {resizable && HANDLES.map((h) => <div key={h} className={`resize-handle ${h}`} onPointerDown={startResize(h)} />)}
    </div>
  );
}

export const Window = memo(WindowImpl);
