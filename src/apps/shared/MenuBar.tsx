import { useEffect, useRef, useState } from 'react';

export interface MenuItem {
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  checked?: boolean;
  separator?: boolean;
  shortcut?: string;
}

export interface Menu {
  label: string;
  items: MenuItem[];
}

interface MenuBarProps {
  menus: Menu[];
}

/** Classic XP menu bar: click to open, hover to switch, click outside to close. */
export function MenuBar({ menus }: MenuBarProps) {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open === null) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('pointerdown', close, true);
    return () => document.removeEventListener('pointerdown', close, true);
  }, [open]);

  return (
    <div className="menubar" ref={ref} role="menubar">
      {menus.map((menu, i) => (
        <div key={menu.label} className="menubar-slot">
          <button
            type="button"
            role="menuitem"
            className={`menubar-label${open === i ? ' open' : ''}`}
            onClick={() => setOpen(open === i ? null : i)}
            onPointerEnter={() => open !== null && setOpen(i)}
          >
            {menu.label}
          </button>
          {open === i && (
            <div className="menu-dropdown" role="menu">
              {menu.items.map((item, j) =>
                item.separator ? (
                  <div key={j} className="menu-separator" />
                ) : (
                  <button
                    key={j}
                    type="button"
                    role="menuitem"
                    className="menu-item"
                    disabled={item.disabled}
                    onClick={() => {
                      setOpen(null);
                      item.onClick?.();
                    }}
                  >
                    <span className="menu-check">{item.checked ? '✓' : ''}</span>
                    <span className="menu-text">{item.label}</span>
                    <span className="menu-shortcut">{item.shortcut}</span>
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
