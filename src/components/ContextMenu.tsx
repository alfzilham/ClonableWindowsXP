import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactElement } from 'react';

export interface CtxItem {
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  separator?: boolean;
  bold?: boolean;
  children?: CtxItem[];
}

interface CtxState {
  x: number;
  y: number;
  items: CtxItem[];
}

interface MenuListProps {
  items: CtxItem[];
  onPick: () => void;
}

function MenuList({ items, onPick }: MenuListProps) {
  const [sub, setSub] = useState<number | null>(null);
  return (
    <div className="ctx-menu" role="menu">
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="menu-separator" />
        ) : (
          <div key={i} className="ctx-slot" onPointerEnter={() => setSub(item.children ? i : null)}>
            <button
              type="button"
              role="menuitem"
              className={`menu-item${item.bold ? ' bold' : ''}`}
              disabled={item.disabled}
              onClick={() => {
                if (item.children) return;
                onPick();
                item.onClick?.();
              }}
            >
              <span className="menu-text">{item.label}</span>
              {item.children && <span className="menu-arrow">{'▶'}</span>}
            </button>
            {item.children && sub === i && (
              <div className="ctx-submenu">
                <MenuList items={item.children} onPick={onPick} />
              </div>
            )}
          </div>
        ),
      )}
    </div>
  );
}

interface ContextMenuViewProps {
  state: CtxState;
  onClose: () => void;
}

function ContextMenuView({ state, onClose }: ContextMenuViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: state.x, y: state.y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: Math.max(0, Math.min(state.x, window.innerWidth - r.width - 2)),
      y: Math.max(0, Math.min(state.y, window.innerHeight - r.height - 2)),
    });
  }, [state]);

  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('keydown', esc);
    window.addEventListener('blur', onClose);
    return () => {
      document.removeEventListener('pointerdown', close, true);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('blur', onClose);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="ctx-root" style={{ left: pos.x, top: pos.y }}>
      <MenuList items={state.items} onPick={onClose} />
    </div>
  );
}

/** Hook returning an `open` handler and the element to render once in the component tree. */
export function useContextMenu(): {
  open: (e: ReactMouseEvent, items: CtxItem[]) => void;
  element: ReactElement | null;
} {
  const [state, setState] = useState<CtxState | null>(null);
  const close = useCallback(() => setState(null), []);
  const open = useCallback((e: ReactMouseEvent, items: CtxItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    setState({ x: e.clientX, y: e.clientY, items });
  }, []);
  return { open, element: state ? <ContextMenuView state={state} onClose={close} /> : null };
}
