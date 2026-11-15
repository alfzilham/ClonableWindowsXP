import { useEffect, useState, type DragEvent as ReactDragEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { IDS, vfs, useVfsVersion, type VNode } from '../core/vfs';
import { describeNode, formatSize, iconForNode, openNode, safely, typeLabel } from '../core/fileTypes';
import { openApp, setWindowTitle, showDialog } from '../core/os';
import { Icon, type IconName } from '../components/Icon';
import { useContextMenu, type CtxItem } from '../components/ContextMenu';
import { MenuBar, type Menu } from './shared/MenuBar';
import { RenameInput } from './shared/RenameInput';
import type { AppProps } from './types';

type ViewMode = 'icons' | 'details';
const DRAG_MIME = 'text/x-xp-node';

function titleFor(node: VNode): string {
  if (node.id === IDS.c) return 'Local Disk (C:)';
  return node.name;
}

export function Explorer({ windowId, props }: AppProps) {
  const startId = typeof props.dirId === 'string' && vfs.get(props.dirId) ? props.dirId : IDS.root;
  const [history, setHistory] = useState<string[]>([startId]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('icons');
  const version = useVfsVersion();
  const ctx = useContextMenu();

  const dirId = history[index];
  const dir = vfs.get(dirId) ?? vfs.require(IDS.root);
  const inRecycle = dir.id === IDS.recycle;
  const isRoot = dir.id === IDS.root;
  const items = vfs.children(dir.id, inRecycle);
  const selectedNode = selected ? vfs.get(selected) : undefined;
  const canEditSelected = !!selectedNode && !selectedNode.system && !inRecycle;
  void version;

  useEffect(() => {
    setWindowTitle(windowId, titleFor(dir));
  }, [windowId, dir.id, dir.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // If the current folder was purged, fall back to My Computer.
  useEffect(() => {
    if (!vfs.get(dirId)) {
      setHistory([IDS.root]);
      setIndex(0);
    }
  }, [dirId, version]);

  const navigate = (id: string) => {
    if (id === dirId) return;
    setHistory((h) => [...h.slice(0, index + 1), id]);
    setIndex((i) => i + 1);
    setSelected(null);
    setRenaming(null);
  };
  const back = () => index > 0 && (setIndex(index - 1), setSelected(null));
  const forward = () => index < history.length - 1 && (setIndex(index + 1), setSelected(null));
  const up = () => dir.parent && navigate(dir.parent);

  const openItem = (node: VNode) => {
    if (inRecycle) {
      showDialog({
        title: 'Recycle Bin',
        message: `You cannot open "${node.name}" while it is in the Recycle Bin.\nRestore it first, then open it.`,
        icon: 'warning',
      });
      return;
    }
    if (node.type === 'dir') navigate(node.id);
    else openNode(node);
  };

  const askDelete = (node: VNode) => {
    const permanent = inRecycle;
    showDialog({
      title: 'Confirm File Delete',
      message: permanent
        ? `Are you sure you want to permanently delete "${node.name}"?`
        : `Are you sure you want to send "${node.name}" to the Recycle Bin?`,
      icon: 'warning',
      buttons: ['Yes', 'No'],
      onClose: (b) => b === 'Yes' && safely(() => vfs.remove(node.id)),
    });
  };

  const newItem = (type: 'dir' | 'file') => {
    if (isRoot || inRecycle) return;
    safely(() => {
      const node = type === 'dir'
        ? vfs.createUnique(dir.id, 'New Folder', 'dir')
        : vfs.createUnique(dir.id, 'New Text Document.txt', 'file');
      setSelected(node.id);
      setRenaming(node.id);
    });
  };

  const emptyBin = () => {
    showDialog({
      title: 'Confirm Multiple File Delete',
      message: 'Are you sure you want to delete all of the items in the Recycle Bin?',
      icon: 'warning',
      buttons: ['Yes', 'No'],
      onClose: (b) => b === 'Yes' && vfs.emptyRecycle(),
    });
  };

  const restoreAll = () => items.forEach((n) => safely(() => vfs.restore(n.id)));

  const goAddress = (text: string) => {
    const target = text.trim().toLowerCase() === 'my computer' ? vfs.get(IDS.root) : vfs.resolve(text.trim(), IDS.c);
    if (target && target.type === 'dir') navigate(target.id);
    else showDialog({ title: 'Explorer', message: `Windows cannot find '${text}'. Check the spelling and try again.`, icon: 'error' });
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    if (e.key === 'F2' && canEditSelected) setRenaming(selected);
    if (e.key === 'Delete' && selectedNode && !selectedNode.system) askDelete(selectedNode);
    if (e.key === 'Backspace') up();
    if (e.key === 'Enter' && selectedNode) openItem(selectedNode);
  };

  const itemMenu = (node: VNode): CtxItem[] =>
    inRecycle
      ? [
          { label: 'Restore', bold: true, onClick: () => safely(() => vfs.restore(node.id)) },
          { separator: true },
          { label: 'Delete', onClick: () => askDelete(node) },
          { label: 'Properties', onClick: () => showDialog({ title: `${node.name} Properties`, message: describeNode(node), icon: 'info' }) },
        ]
      : [
          { label: 'Open', bold: true, onClick: () => openItem(node) },
          { separator: true },
          { label: 'Delete', disabled: !!node.system, onClick: () => askDelete(node) },
          { label: 'Rename', disabled: !!node.system, onClick: () => setRenaming(node.id) },
          { separator: true },
          { label: 'Properties', onClick: () => showDialog({ title: `${node.name} Properties`, message: describeNode(node), icon: 'info' }) },
        ];

  const backgroundMenu: CtxItem[] = inRecycle
    ? [{ label: 'Empty Recycle Bin', disabled: items.length === 0, onClick: emptyBin }]
    : [
        { label: 'View', children: [{ label: 'Icons', onClick: () => setView('icons') }, { label: 'Details', onClick: () => setView('details') }] },
        { separator: true },
        { label: 'New', disabled: isRoot, children: [{ label: 'Folder', onClick: () => newItem('dir') }, { label: 'Text Document', onClick: () => newItem('file') }] },
      ];

  const menus: Menu[] = [
    {
      label: 'File',
      items: [
        { label: 'New Folder', disabled: isRoot || inRecycle, onClick: () => newItem('dir') },
        { label: 'New Text Document', disabled: isRoot || inRecycle, onClick: () => newItem('file') },
        { separator: true },
        { label: 'Open', disabled: !selectedNode, onClick: () => selectedNode && openItem(selectedNode) },
        { label: 'Delete', disabled: !selectedNode || !!selectedNode.system, onClick: () => selectedNode && askDelete(selectedNode) },
        { label: 'Rename', disabled: !canEditSelected, onClick: () => setRenaming(selected) },
        { separator: true },
        { label: 'Empty Recycle Bin', disabled: !inRecycle || items.length === 0, onClick: emptyBin },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Icons', checked: view === 'icons', onClick: () => setView('icons') },
        { label: 'Details', checked: view === 'details', onClick: () => setView('details') },
      ],
    },
    {
      label: 'Go',
      items: [
        { label: 'Back', disabled: index === 0, onClick: back },
        { label: 'Forward', disabled: index >= history.length - 1, onClick: forward },
        { label: 'Up One Level', disabled: !dir.parent, onClick: up },
        { separator: true },
        { label: 'My Computer', onClick: () => navigate(IDS.root) },
        { label: 'My Documents', onClick: () => navigate(IDS.docs) },
      ],
    },
    { label: 'Help', items: [{ label: 'About Windows', onClick: () => openApp('about') }] },
  ];

  const dropOn = (targetId: string, e: ReactDragEvent, recycle = false) => {
    const nodeId = e.dataTransfer.getData(DRAG_MIME);
    if (!nodeId) return;
    e.preventDefault();
    e.stopPropagation();
    safely(() => (recycle ? vfs.remove(nodeId) : vfs.move(nodeId, targetId)));
  };
  const acceptDrop = (e: ReactDragEvent) => {
    if (e.dataTransfer.types.includes(DRAG_MIME)) e.preventDefault();
  };

  const detailNode = selectedNode ?? dir;
  const placeLink = (label: string, icon: IconName, id: string, recycle = false) => (
    <button
      type="button"
      className="task-link"
      onClick={() => navigate(id)}
      onDragOver={recycle ? acceptDrop : undefined}
      onDrop={recycle ? (e) => dropOn(IDS.recycle, e, true) : undefined}
    >
      <Icon name={icon} size={16} />
      {label}
    </button>
  );

  return (
    <div className="explorer" tabIndex={0} onKeyDown={onKeyDown}>
      <MenuBar menus={menus} />
      <div className="exp-toolbar">
        <button type="button" className="tb-btn" disabled={index === 0} onClick={back}><Icon name="back" size={22} /><span>Back</span></button>
        <button type="button" className="tb-btn" disabled={index >= history.length - 1} onClick={forward}><Icon name="forward" size={22} /></button>
        <button type="button" className="tb-btn" disabled={!dir.parent} onClick={up}><Icon name="up" size={22} /></button>
        <span className="tb-sep" />
        <button type="button" className={`tb-btn${view === 'icons' ? ' on' : ''}`} onClick={() => setView('icons')}>Icons</button>
        <button type="button" className={`tb-btn${view === 'details' ? ' on' : ''}`} onClick={() => setView('details')}>Details</button>
      </div>
      <div className="exp-address">
        <span>Address</span>
        <div className="address-box">
          <Icon name={iconForNode(dir, true)} size={16} />
          <input
            key={`${dirId}-${dir.name}`}
            defaultValue={vfs.pathOf(dir.id)}
            spellCheck={false}
            onKeyDown={(e) => e.key === 'Enter' && goAddress(e.currentTarget.value)}
          />
        </div>
        <button type="button" className="xp-button go" onClick={() => up()} disabled={!dir.parent}>Up</button>
      </div>
      <div className="exp-main">
        <aside className="exp-side">
          <section className="side-box">
            <h4>{inRecycle ? 'Recycle Bin Tasks' : 'File and Folder Tasks'}</h4>
            {inRecycle ? (
              <>
                <button type="button" className="task-link" disabled={items.length === 0} onClick={emptyBin}>Empty the Recycle Bin</button>
                <button type="button" className="task-link" disabled={items.length === 0} onClick={() => (selectedNode ? safely(() => vfs.restore(selectedNode.id)) : restoreAll())}>
                  {selectedNode ? 'Restore this item' : 'Restore all items'}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="task-link" disabled={isRoot} onClick={() => newItem('dir')}>Make a new folder</button>
                <button type="button" className="task-link" disabled={isRoot} onClick={() => newItem('file')}>New text document</button>
                <button type="button" className="task-link" disabled={!canEditSelected} onClick={() => setRenaming(selected)}>Rename this item</button>
                <button type="button" className="task-link" disabled={!selectedNode || !!selectedNode.system} onClick={() => selectedNode && askDelete(selectedNode)}>Delete this item</button>
              </>
            )}
          </section>
          <section className="side-box">
            <h4>Other Places</h4>
            {placeLink('My Computer', 'computer', IDS.root)}
            {placeLink('My Documents', 'folder', IDS.docs)}
            {placeLink('Desktop', 'display', IDS.desktop)}
            {placeLink('Recycle Bin', 'recycle', IDS.recycle, true)}
          </section>
          <section className="side-box">
            <h4>Details</h4>
            <div className="detail-name">{titleFor(detailNode)}</div>
            <div className="detail-line">{typeLabel(detailNode)}</div>
            {detailNode.id !== IDS.root && <div className="detail-line">{formatSize(vfs.sizeOf(detailNode))}</div>}
          </section>
        </aside>
        <div
          className={`exp-list ${view}`}
          onPointerDown={() => { setSelected(null); setRenaming(null); }}
          onContextMenu={(e) => ctx.open(e, backgroundMenu)}
          onDragOver={isRoot || inRecycle ? undefined : acceptDrop}
          onDrop={isRoot || inRecycle ? undefined : (e) => dropOn(dir.id, e)}
        >
          {view === 'details' && (
            <div className="detail-head"><span>Name</span><span>Size</span><span>Type</span><span>Date Modified</span></div>
          )}
          {isRoot && <div className="list-group">Hard Disk Drives</div>}
          {items.length === 0 && <div className="list-empty">{inRecycle ? 'Recycle Bin is empty.' : 'This folder is empty.'}</div>}
          <div className={view === 'icons' ? 'items-grid' : 'items-rows'}>
            {items.map((node) => (
              <div
                key={node.id}
                className={`exp-item${selected === node.id ? ' selected' : ''}`}
                draggable={!node.system}
                onDragStart={(e) => e.dataTransfer.setData(DRAG_MIME, node.id)}
                onDragOver={node.type === 'dir' && !inRecycle ? acceptDrop : undefined}
                onDrop={node.type === 'dir' && !inRecycle ? (e) => dropOn(node.id, e) : undefined}
                onPointerDown={(e) => { e.stopPropagation(); setSelected(node.id); }}
                onDoubleClick={() => openItem(node)}
                onContextMenu={(e) => { setSelected(node.id); ctx.open(e, itemMenu(node)); }}
              >
                <span className="exp-item-name">
                  <Icon name={iconForNode(node)} size={view === 'icons' ? 32 : 16} />
                  {renaming === node.id ? (
                    <RenameInput
                      initial={node.name}
                      onCancel={() => setRenaming(null)}
                      onCommit={(name) => {
                        setRenaming(null);
                        if (name !== node.name) safely(() => vfs.rename(node.id, name));
                      }}
                    />
                  ) : (
                    <span className="exp-label">{titleFor(node)}</span>
                  )}
                </span>
                {view === 'details' && (
                  <>
                    <span>{node.type === 'file' ? formatSize(vfs.sizeOf(node)) : ''}</span>
                    <span>{typeLabel(node)}</span>
                    <span>{new Date(node.modified).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="statusbar">
        <span>{items.length} object{items.length === 1 ? '' : 's'}</span>
        <span>{selectedNode ? `${typeLabel(selectedNode)}  ${formatSize(vfs.sizeOf(selectedNode))}` : ''}</span>
      </div>
      {ctx.element}
    </div>
  );
}
