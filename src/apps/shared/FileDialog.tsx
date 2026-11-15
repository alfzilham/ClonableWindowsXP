import { useState } from 'react';
import { IDS, extOf, vfs, useVfsVersion, type VNode } from '../../core/vfs';
import { iconForNode } from '../../core/fileTypes';
import { Icon } from '../../components/Icon';

export interface FileDialogResult {
  dirId: string;
  name: string;
  node?: VNode;
}

interface FileDialogProps {
  mode: 'open' | 'save';
  startDirId?: string;
  defaultName?: string;
  /** Extension appended to names typed without one (save mode). */
  defaultExt?: string;
  /** Which files are listed (folders are always listed). */
  accept?: (node: VNode) => boolean;
  onConfirm: (result: FileDialogResult) => void;
  onCancel: () => void;
}

/** In-window Open / Save As dialog backed by the virtual file system. */
export function FileDialog({ mode, startDirId = IDS.docs, defaultName = '', defaultExt, accept, onConfirm, onCancel }: FileDialogProps) {
  const [dirId, setDirId] = useState(vfs.get(startDirId) ? startDirId : IDS.docs);
  const [name, setName] = useState(defaultName);
  useVfsVersion();
  const dir = vfs.get(dirId) ?? vfs.require(IDS.docs);
  const items = vfs.children(dir.id).filter((n) => n.type === 'dir' || !accept || accept(n));

  const confirm = () => {
    let clean = name.trim();
    if (!clean) return;
    if (mode === 'save' && defaultExt && !extOf(clean)) clean = `${clean}.${defaultExt}`;
    const node = vfs.findChild(dir.id, clean);
    if (mode === 'open' && (!node || node.type !== 'file')) return;
    onConfirm({ dirId: dir.id, name: clean, node });
  };

  return (
    <div className="fd-overlay" onPointerDown={(e) => e.stopPropagation()}>
      <div className="fd-box" role="dialog" aria-label={mode === 'open' ? 'Open' : 'Save As'}>
        <div className="titlebar active-title"><span className="title-text">{mode === 'open' ? 'Open' : 'Save As'}</span></div>
        <div className="fd-body">
          <div className="fd-row">
            <label>{mode === 'open' ? 'Look in:' : 'Save in:'}</label>
            <div className="fd-path"><Icon name="folderOpen" size={16} />{vfs.pathOf(dir.id)}</div>
            <button type="button" className="xp-button small" disabled={!dir.parent} onClick={() => dir.parent && setDirId(dir.parent)}>Up</button>
          </div>
          <div className="fd-list">
            {items.length === 0 && <div className="list-empty">No items.</div>}
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`fd-item${n.name === name ? ' selected' : ''}`}
                onClick={() => (n.type === 'file' ? setName(n.name) : undefined)}
                onDoubleClick={() => (n.type === 'dir' ? setDirId(n.id) : (setName(n.name), onConfirm({ dirId: dir.id, name: n.name, node: n })))}
              >
                <Icon name={iconForNode(n)} size={16} />
                {n.name}
              </button>
            ))}
          </div>
          <div className="fd-row">
            <label htmlFor="fd-name">File name:</label>
            <input id="fd-name" className="xp-input" value={name} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && confirm()} />
            <button type="button" className="xp-button" onClick={confirm}>{mode === 'open' ? 'Open' : 'Save'}</button>
          </div>
          <div className="fd-row end">
            <button type="button" className="xp-button" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
