import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { IDS, vfs } from '../core/vfs';
import { safely } from '../core/fileTypes';
import { closeWindow, setWindowTitle, showDialog } from '../core/os';
import { MenuBar, type Menu } from './shared/MenuBar';
import { FileDialog, type FileDialogResult } from './shared/FileDialog';
import { PALETTE, floodFill, invertColors, parseColor } from './paintLogic';
import type { AppProps } from './types';

type Tool = 'pencil' | 'brush' | 'eraser' | 'line' | 'rect' | 'ellipse' | 'fill' | 'picker';

const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: 'pencil', label: '✎', hint: 'Pencil' },
  { id: 'brush', label: '🖌', hint: 'Brush' },
  { id: 'eraser', label: '▭', hint: 'Eraser' },
  { id: 'line', label: '╱', hint: 'Line' },
  { id: 'rect', label: '□', hint: 'Rectangle' },
  { id: 'ellipse', label: '◯', hint: 'Ellipse' },
  { id: 'fill', label: '◆', hint: 'Fill With Color' },
  { id: 'picker', label: '⌖', hint: 'Pick Color' },
];

const WIDTH = 640;
const HEIGHT = 400;
const MAX_UNDO = 20;
const isImage = (n: { name: string; mime: string }) => n.mime.startsWith('image/') || /\.(png|bmp|jpg|jpeg|gif)$/i.test(n.name);

export function Paint({ windowId, props }: AppProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const undoStack = useRef<ImageData[]>([]);
  const stroke = useRef<{ x: number; y: number; snapshot: ImageData | null; button: number } | null>(null);
  const initialFile = typeof props.fileId === 'string' ? props.fileId : null;
  const [fileId, setFileId] = useState<string | null>(initialFile);
  const [tool, setTool] = useState<Tool>('pencil');
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const [size, setSize] = useState(2);
  const [dirty, setDirty] = useState(false);
  const [dialog, setDialog] = useState<'open' | 'save' | null>(null);
  const [coords, setCoords] = useState('');

  const name = fileId ? (vfs.get(fileId)?.name ?? 'untitled') : 'untitled';

  useEffect(() => {
    setWindowTitle(windowId, `${name} - Paint`);
  }, [windowId, name]);

  const ctx2d = () => canvasRef.current?.getContext('2d', { willReadFrequently: true }) ?? null;

  const clear = useCallback(() => {
    const c = ctx2d();
    if (!c) return;
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, WIDTH, HEIGHT);
  }, []);

  const loadDataUrl = useCallback((url: string) => {
    const img = new Image();
    img.onload = () => {
      clear();
      ctx2d()?.drawImage(img, 0, 0);
    };
    img.src = url;
  }, [clear]);

  useEffect(() => {
    clear();
    const node = initialFile ? vfs.get(initialFile) : undefined;
    if (node?.content.startsWith('data:image')) loadDataUrl(node.content);
  }, [clear, initialFile, loadDataUrl]);

  const pushUndo = () => {
    const c = ctx2d();
    if (!c) return;
    undoStack.current.push(c.getImageData(0, 0, WIDTH, HEIGHT));
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
  };

  const undo = () => {
    const snap = undoStack.current.pop();
    if (snap) ctx2d()?.putImageData(snap, 0, 0);
  };

  const pos = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const r = canvas.getBoundingClientRect();
    return { x: Math.floor((e.clientX - r.left) * (WIDTH / r.width)), y: Math.floor((e.clientY - r.top) * (HEIGHT / r.height)) };
  };

  const drawShape = (c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string) => {
    c.strokeStyle = color;
    c.lineWidth = size;
    c.lineCap = 'round';
    c.beginPath();
    if (tool === 'line') {
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
    } else if (tool === 'rect') {
      c.rect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
    } else {
      c.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, 0, 0, Math.PI * 2);
    }
    c.stroke();
  };

  const freehand = (c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string) => {
    c.strokeStyle = color;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = tool === 'pencil' ? 1 : tool === 'eraser' ? size * 3 : size * 2;
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1 + 0.01, y1 + 0.01);
    c.stroke();
  };

  const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const c = ctx2d();
    if (!c) return;
    const { x, y } = pos(e);
    const color = e.button === 2 ? bg : fg;
    if (tool === 'picker') {
      const [r, g, b] = c.getImageData(x, y, 1, 1).data;
      const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
      if (e.button === 2) setBg(hex);
      else setFg(hex);
      return;
    }
    pushUndo();
    setDirty(true);
    if (tool === 'fill') {
      const img = c.getImageData(0, 0, WIDTH, HEIGHT);
      floodFill(img, x, y, parseColor(color));
      c.putImageData(img, 0, 0);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    stroke.current = { x, y, snapshot: tool === 'line' || tool === 'rect' || tool === 'ellipse' ? c.getImageData(0, 0, WIDTH, HEIGHT) : null, button: e.button };
    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') freehand(c, x, y, x, y, tool === 'eraser' ? bg : color);
  };

  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const { x, y } = pos(e);
    setCoords(`${x}, ${y}`);
    const s = stroke.current;
    const c = ctx2d();
    if (!s || !c) return;
    const color = s.button === 2 ? bg : fg;
    if (s.snapshot) {
      c.putImageData(s.snapshot, 0, 0);
      drawShape(c, s.x, s.y, x, y, color);
    } else {
      freehand(c, s.x, s.y, x, y, tool === 'eraser' ? bg : color);
      s.x = x;
      s.y = y;
    }
  };

  const onUp = () => {
    stroke.current = null;
  };

  const writeFile = (r: FileDialogResult) => {
    const url = canvasRef.current?.toDataURL('image/png') ?? '';
    const apply = () => {
      safely(() => {
        const target = r.node ?? vfs.createFile(r.dirId, r.name, '', 'image/png');
        vfs.writeFile(target.id, url, 'image/png');
        setFileId(target.id);
        setDirty(false);
      });
      setDialog(null);
    };
    if (r.node) {
      showDialog({ title: 'Save As', message: `${r.name} already exists.\nDo you want to replace it?`, icon: 'warning', buttons: ['Yes', 'No'], onClose: (b) => b === 'Yes' && apply() });
    } else apply();
  };

  const save = () => {
    if (fileId && vfs.get(fileId)) {
      const url = canvasRef.current?.toDataURL('image/png') ?? '';
      if (safely(() => vfs.writeFile(fileId, url, 'image/png'))) setDirty(false);
    } else setDialog('save');
  };

  const guard = (next: () => void) => {
    if (!dirty) return next();
    showDialog({
      title: 'Paint',
      message: `Save changes to ${name}?`,
      icon: 'warning',
      buttons: ['Yes', 'No', 'Cancel'],
      onClose: (b) => {
        if (b === 'Yes') { save(); next(); } else if (b === 'No') next();
      },
    });
  };

  const menus: Menu[] = [
    {
      label: 'File',
      items: [
        { label: 'New', onClick: () => guard(() => { clear(); setFileId(null); setDirty(false); undoStack.current = []; }) },
        { label: 'Open...', onClick: () => guard(() => setDialog('open')) },
        { label: 'Save', onClick: save },
        { label: 'Save As...', onClick: () => setDialog('save') },
        { separator: true },
        { label: 'Exit', onClick: () => guard(() => closeWindow(windowId)) },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', onClick: undo },
        { label: 'Clear Image', onClick: () => { pushUndo(); clear(); setDirty(true); } },
      ],
    },
    {
      label: 'Image',
      items: [
        {
          label: 'Invert Colors',
          onClick: () => {
            const c = ctx2d();
            if (!c) return;
            pushUndo();
            const img = c.getImageData(0, 0, WIDTH, HEIGHT);
            invertColors(img);
            c.putImageData(img, 0, 0);
            setDirty(true);
          },
        },
      ],
    },
    { label: 'Help', items: [{ label: 'About Paint', onClick: () => showDialog({ title: 'About Paint', message: 'Paint (clone)\nDraw, fill and save pictures to My Pictures.', icon: 'info' }) }] },
  ];

  return (
    <div className="paint" tabIndex={0} onKeyDown={(e) => e.ctrlKey && e.key.toLowerCase() === 'z' && undo()}>
      <MenuBar menus={menus} />
      <div className="paint-main">
        <div className="paint-tools">
          <div className="tool-grid">
            {TOOLS.map((t) => (
              <button key={t.id} type="button" title={t.hint} className={`tool-btn${tool === t.id ? ' on' : ''}`} onClick={() => setTool(t.id)}>{t.label}</button>
            ))}
          </div>
          <div className="size-box">
            {[1, 2, 4, 6].map((s) => (
              <button key={s} type="button" className={`size-btn${size === s ? ' on' : ''}`} onClick={() => setSize(s)} aria-label={`Size ${s}`}>
                <span style={{ height: s, background: '#000' }} />
              </button>
            ))}
          </div>
        </div>
        <div className="paint-workspace">
          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
            className="paint-canvas"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
      </div>
      <div className="paint-colors">
        <div className="color-current">
          <span className="swatch bgc" style={{ background: bg }} />
          <span className="swatch fgc" style={{ background: fg }} />
        </div>
        <div className="palette">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              className="swatch"
              style={{ background: c }}
              aria-label={c}
              onClick={() => setFg(c)}
              onContextMenu={(e) => { e.preventDefault(); setBg(c); }}
            />
          ))}
        </div>
      </div>
      <div className="statusbar"><span>{TOOLS.find((t) => t.id === tool)?.hint}</span><span>{coords}</span></div>
      {dialog === 'open' && (
        <FileDialog
          mode="open"
          startDirId={IDS.pictures}
          accept={isImage}
          onConfirm={(r) => {
            setDialog(null);
            if (r.node) { setFileId(r.node.id); loadDataUrl(r.node.content); setDirty(false); undoStack.current = []; }
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'save' && (
        <FileDialog mode="save" startDirId={IDS.pictures} defaultName={fileId ? name : 'untitled.png'} defaultExt="png" accept={isImage} onConfirm={writeFile} onCancel={() => setDialog(null)} />
      )}
    </div>
  );
}
