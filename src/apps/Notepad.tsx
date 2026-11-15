import { useEffect, useRef, useState } from 'react';
import { IDS, vfs } from '../core/vfs';
import { safely } from '../core/fileTypes';
import { closeWindow, setWindowTitle, showDialog } from '../core/os';
import { MenuBar, type Menu } from './shared/MenuBar';
import { FileDialog, type FileDialogResult } from './shared/FileDialog';
import type { AppProps } from './types';

const isText = (name: string) => /\.(txt|log|md|ini|cfg|json|js|ts|css|html|csv|bat)$/i.test(name);

export function Notepad({ windowId, props }: AppProps) {
  const initialId = typeof props.fileId === 'string' && vfs.get(props.fileId) ? props.fileId : null;
  const [fileId, setFileId] = useState<string | null>(initialId);
  const [text, setText] = useState(initialId ? (vfs.get(initialId)?.content ?? '') : '');
  const [dirty, setDirty] = useState(false);
  const [wrap, setWrap] = useState(true);
  const [dialog, setDialog] = useState<'open' | 'save' | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const pendingAfterSave = useRef<(() => void) | null>(null);

  const fileName = fileId ? (vfs.get(fileId)?.name ?? 'Untitled') : 'Untitled';

  useEffect(() => {
    setWindowTitle(windowId, `${dirty ? '*' : ''}${fileName} - Notepad`);
  }, [windowId, fileName, dirty]);

  const saveTo = (id: string) => {
    if (safely(() => vfs.writeFile(id, text))) {
      setDirty(false);
      pendingAfterSave.current?.();
    }
    pendingAfterSave.current = null;
  };

  const save = () => {
    if (fileId && vfs.get(fileId)) saveTo(fileId);
    else setDialog('save');
  };

  const onSaveAs = (r: FileDialogResult) => {
    const write = () => {
      safely(() => {
        const target = r.node ?? vfs.createFile(r.dirId, r.name);
        vfs.writeFile(target.id, text);
        setFileId(target.id);
        setDirty(false);
      });
      setDialog(null);
      pendingAfterSave.current?.();
      pendingAfterSave.current = null;
    };
    if (r.node) {
      showDialog({
        title: 'Save As',
        message: `${r.name} already exists.\nDo you want to replace it?`,
        icon: 'warning',
        buttons: ['Yes', 'No'],
        onClose: (b) => b === 'Yes' && write(),
      });
    } else write();
  };

  /** Run `next` after resolving unsaved changes (Yes = save first, No = discard, Cancel = abort). */
  const guard = (next: () => void) => {
    if (!dirty) return next();
    showDialog({
      title: 'Notepad',
      message: `The text in the ${fileName} file has changed.\n\nDo you want to save the changes?`,
      icon: 'warning',
      buttons: ['Yes', 'No', 'Cancel'],
      onClose: (b) => {
        if (b === 'Yes') {
          pendingAfterSave.current = next;
          save();
        } else if (b === 'No') next();
      },
    });
  };

  const newDoc = () => guard(() => { setFileId(null); setText(''); setDirty(false); });

  const openFile = (r: FileDialogResult) => {
    setDialog(null);
    if (!r.node) return;
    setFileId(r.node.id);
    setText(r.node.content);
    setDirty(false);
  };

  const insertDate = () => {
    const el = areaRef.current;
    const stamp = new Date().toLocaleString();
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + stamp + text.slice(end));
    setDirty(true);
  };

  const menus: Menu[] = [
    {
      label: 'File',
      items: [
        { label: 'New', shortcut: 'Ctrl+N', onClick: newDoc },
        { label: 'Open...', shortcut: 'Ctrl+O', onClick: () => guard(() => setDialog('open')) },
        { label: 'Save', shortcut: 'Ctrl+S', onClick: save },
        { label: 'Save As...', onClick: () => setDialog('save') },
        { separator: true },
        { label: 'Exit', onClick: () => guard(() => closeWindow(windowId)) },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Select All', shortcut: 'Ctrl+A', onClick: () => areaRef.current?.select() },
        { label: 'Time/Date', shortcut: 'F5', onClick: insertDate },
      ],
    },
    { label: 'Format', items: [{ label: 'Word Wrap', checked: wrap, onClick: () => setWrap((w) => !w) }] },
    {
      label: 'Help',
      items: [{ label: 'About Notepad', onClick: () => showDialog({ title: 'About Notepad', message: 'Notepad (clone)\nA simple text editor for the Windows XP Clone.', icon: 'info' }) }],
    },
  ];

  return (
    <div
      className="notepad"
      onKeyDown={(e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
        if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); newDoc(); }
        if (e.ctrlKey && e.key.toLowerCase() === 'o') { e.preventDefault(); guard(() => setDialog('open')); }
        if (e.key === 'F5') { e.preventDefault(); insertDate(); }
      }}
    >
      <MenuBar menus={menus} />
      <textarea
        ref={areaRef}
        className="notepad-area"
        value={text}
        wrap={wrap ? 'soft' : 'off'}
        spellCheck={false}
        onChange={(e) => { setText(e.target.value); setDirty(true); }}
      />
      {dialog === 'open' && (
        <FileDialog mode="open" accept={(n) => isText(n.name)} startDirId={IDS.docs} onConfirm={openFile} onCancel={() => setDialog(null)} />
      )}
      {dialog === 'save' && (
        <FileDialog
          mode="save"
          startDirId={fileId ? (vfs.get(fileId)?.parent ?? IDS.docs) : IDS.docs}
          defaultName={fileId ? fileName : 'Untitled.txt'}
          defaultExt="txt"
          accept={(n) => isText(n.name)}
          onConfirm={onSaveAs}
          onCancel={() => { pendingAfterSave.current = null; setDialog(null); }}
        />
      )}
    </div>
  );
}
