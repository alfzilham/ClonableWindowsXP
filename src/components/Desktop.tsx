import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { IDS, vfs, useVfsVersion } from '../core/vfs';
import { describeNode, iconForNode, openNode, safely } from '../core/fileTypes';
import { openApp, os, setStartOpen, showDialog } from '../core/os';
import { useStore } from '../core/store';
import { RenameInput } from '../apps/shared/RenameInput';
import { useContextMenu, type CtxItem } from './ContextMenu';
import { Icon, type IconName } from './Icon';
import { Taskbar } from './Taskbar';
import { Window } from './Window';
import { Dialogs } from './Dialogs';

interface DesktopIconDef {
  id: string;
  label: string;
  icon: IconName;
  open: () => void;
  /** VFS node id for icons backed by the Desktop folder. */
  nodeId?: string;
}

interface Band {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const DRAG_MIME = 'text/x-xp-node';

export function Desktop() {
  const windows = useStore(os, (s) => s.windows);
  const activeId = useStore(os, (s) => s.activeId);
  const wallpaper = useStore(os, (s) => s.wallpaper);
  const version = useVfsVersion();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<string | null>(null);
  const [band, setBand] = useState<Band | null>(null);
  const iconsRef = useRef<HTMLDivElement>(null);
  const ctx = useContextMenu();

  const recycleFull = vfs.children(IDS.recycle, true).length > 0;

  const systemIcons: DesktopIconDef[] = [
    { id: 'sys-computer', label: 'My Computer', icon: 'computer', open: () => openApp('explorer', { dirId: IDS.root }) },
    { id: 'sys-docs', label: 'My Documents', icon: 'folder', open: () => openApp('explorer', { dirId: IDS.docs }) },
    { id: 'sys-recycle', label: 'Recycle Bin', icon: recycleFull ? 'recycleFull' : 'recycle', open: () => openApp('explorer', { dirId: IDS.recycle }) },
    { id: 'sys-ie', label: 'Internet Explorer', icon: 'ie', open: () => openApp('iexplore') },
    { id: 'sys-mine', label: 'Minesweeper', icon: 'mine', open: () => openApp('minesweeper') },
  ];

  // `version` is read so the list refreshes after every VFS mutation.
  const fileIcons: DesktopIconDef[] = vfs.children(IDS.desktop).map((n) => ({
    id: `node-${n.id}`,
    nodeId: n.id,
    label: n.name,
    icon: iconForNode(n),
    open: () => openNode(n),
  }));
  void version;
  const icons = [...systemIcons, ...fileIcons];

  // Drop a stale selection when icons disappear.
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(icons.map((i) => i.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const createOnDesktop = (type: 'dir' | 'file') => {
    safely(() => {
      const node = type === 'dir'
        ? vfs.createUnique(IDS.desktop, 'New Folder', 'dir')
        : vfs.createUnique(IDS.desktop, 'New Text Document.txt', 'file');
      setSelected(new Set([`node-${node.id}`]));
      setRenaming(node.id);
    });
  };

  const showProperties = (icon: DesktopIconDef) => {
    const node = icon.nodeId ? vfs.get(icon.nodeId) : undefined;
    showDialog({ title: `${icon.label} Properties`, message: node ? describeNode(node) : `${icon.label}\nType: System Folder`, icon: 'info' });
  };

  const iconMenu = (icon: DesktopIconDef): CtxItem[] => [
    { label: 'Open', bold: true, onClick: icon.open },
    { separator: true },
    ...(icon.nodeId
      ? [
          { label: 'Delete', onClick: () => safely(() => vfs.remove(icon.nodeId as string)) },
          { label: 'Rename', onClick: () => setRenaming(icon.nodeId as string) },
          { separator: true } as CtxItem,
        ]
      : []),
    { label: 'Properties', onClick: () => showProperties(icon) },
  ];

  const desktopMenu: CtxItem[] = [
    { label: 'Refresh', onClick: () => setSelected(new Set()) },
    { separator: true },
    {
      label: 'New',
      children: [
        { label: 'Folder', onClick: () => createOnDesktop('dir') },
        { label: 'Text Document', onClick: () => createOnDesktop('file') },
      ],
    },
    { separator: true },
    { label: 'Properties', onClick: () => openApp('display') },
  ];

  // ---- rubber-band selection ----
  const startBand = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setStartOpen(false);
    const host = e.currentTarget;
    const origin = { x: e.clientX, y: e.clientY };
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) < 4) return;
      moved = true;
      const next = { x1: origin.x, y1: origin.y, x2: ev.clientX, y2: ev.clientY };
      setBand(next);
      const left = Math.min(next.x1, next.x2);
      const right = Math.max(next.x1, next.x2);
      const top = Math.min(next.y1, next.y2);
      const bottom = Math.max(next.y1, next.y2);
      const hit = new Set<string>();
      iconsRef.current?.querySelectorAll<HTMLElement>('[data-icon-id]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.left < right && r.right > left && r.top < bottom && r.bottom > top) hit.add(el.dataset.iconId as string);
      });
      setSelected(hit);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!moved) setSelected(new Set());
      setBand(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    host.focus();
  };

  const onIconPointerDown = (e: ReactPointerEvent, id: string) => {
    e.stopPropagation();
    setStartOpen(false);
    if (e.ctrlKey) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else if (!selected.has(id)) {
      setSelected(new Set([id]));
    }
  };

  return (
    <div className={`desktop wallpaper-${wallpaper}`} data-testid="desktop">
      <div
        className="desktop-surface"
        onPointerDown={startBand}
        onContextMenu={(e) => {
          setSelected(new Set());
          ctx.open(e, desktopMenu);
        }}
      >
        <div className="desktop-icons" ref={iconsRef}>
          {icons.map((icon) => {
            const isRecycle = icon.id === 'sys-recycle';
            const isDocs = icon.id === 'sys-docs';
            return (
              <div
                key={icon.id}
                data-icon-id={icon.id}
                className={`desktop-icon${selected.has(icon.id) ? ' selected' : ''}`}
                draggable={!!icon.nodeId}
                onDragStart={(e) => {
                  if (icon.nodeId) e.dataTransfer.setData(DRAG_MIME, icon.nodeId);
                }}
                onDragOver={(e) => {
                  if ((isRecycle || isDocs) && e.dataTransfer.types.includes(DRAG_MIME)) e.preventDefault();
                }}
                onDrop={(e) => {
                  const nodeId = e.dataTransfer.getData(DRAG_MIME);
                  if (!nodeId) return;
                  e.preventDefault();
                  safely(() => (isRecycle ? vfs.remove(nodeId) : vfs.move(nodeId, IDS.docs)));
                }}
                onPointerDown={(e) => onIconPointerDown(e, icon.id)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  icon.open();
                }}
                onContextMenu={(e) => {
                  setSelected(new Set([icon.id]));
                  ctx.open(e, iconMenu(icon));
                }}
              >
                <Icon name={icon.icon} size={32} />
                {renaming && renaming === icon.nodeId ? (
                  <RenameInput
                    initial={icon.label}
                    onCancel={() => setRenaming(null)}
                    onCommit={(name) => {
                      setRenaming(null);
                      if (name !== icon.label) safely(() => vfs.rename(icon.nodeId as string, name));
                    }}
                  />
                ) : (
                  <span className="desktop-icon-label">{icon.label}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {band && (
        <div
          className="selection-band"
          style={{
            left: Math.min(band.x1, band.x2),
            top: Math.min(band.y1, band.y2),
            width: Math.abs(band.x2 - band.x1),
            height: Math.abs(band.y2 - band.y1),
          }}
        />
      )}
      {windows.map((w) => (
        <Window key={w.id} win={w} active={w.id === activeId} />
      ))}
      <Dialogs />
      <Taskbar />
      {ctx.element}
    </div>
  );
}
