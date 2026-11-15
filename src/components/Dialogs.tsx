import { closeDialog, os } from '../core/os';
import { useStore } from '../core/store';
import { Icon } from './Icon';

/** XP-style modal message boxes, stacked above every window. */
export function Dialogs() {
  const dialogs = useStore(os, (s) => s.dialogs);
  if (dialogs.length === 0) return null;
  return (
    <div className="modal-scrim dialog-layer">
      {dialogs.map((d, i) => (
        <div
          key={d.id}
          className="msgbox"
          role="alertdialog"
          aria-label={d.title}
          style={{ zIndex: 1000 + i, transform: `translate(${i * 14}px, ${i * 14}px)` }}
        >
          <div className="titlebar active-title">
            <span className="title-text">{d.title}</span>
            <button type="button" className="title-btn close" aria-label="Close" onClick={() => closeDialog(d.id, d.buttons[d.buttons.length - 1])}>
              <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.500 1.500l7 7M8.500 1.500l-7 7" stroke="#fff" strokeWidth="1.800" /></svg>
            </button>
          </div>
          <div className="msgbox-body">
            <Icon name={d.icon} size={32} />
            <p className="msgbox-text">{d.message}</p>
          </div>
          <div className="msgbox-buttons">
            {d.buttons.map((b, bi) => (
              <button key={b} type="button" className="xp-button" autoFocus={bi === 0} onClick={() => closeDialog(d.id, b)}>
                {b}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
