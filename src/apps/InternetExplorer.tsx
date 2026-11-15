import { useEffect, useState } from 'react';
import { setWindowTitle } from '../core/os';
import { Icon } from '../components/Icon';
import { MenuBar, type Menu } from './shared/MenuBar';
import { HOME, normalizeUrl } from './urlLogic';
import type { AppProps } from './types';

const FAVORITES = [
  { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Windows_XP' },
  { label: 'Internet Archive', url: 'https://archive.org' },
  { label: 'Example Domain', url: 'https://example.com' },
  { label: 'OpenStreetMap', url: 'https://www.openstreetmap.org' },
];

export function InternetExplorer({ windowId, props }: AppProps) {
  const start = typeof props.url === 'string' ? normalizeUrl(props.url) : HOME;
  const [history, setHistory] = useState<string[]>([start]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reloads, setReloads] = useState(0);
  const url = history[index];

  useEffect(() => {
    setWindowTitle(windowId, url === HOME ? 'Welcome - Internet Explorer' : `${url} - Internet Explorer`);
    setLoading(url !== HOME);
  }, [windowId, url]);

  const go = (target: string) => {
    const next = normalizeUrl(target);
    setHistory((h) => [...h.slice(0, index + 1), next]);
    setIndex((i) => i + 1);
  };

  const menus: Menu[] = [
    {
      label: 'File',
      items: [{ label: 'Open in new browser tab', disabled: url === HOME, onClick: () => window.open(url, '_blank', 'noopener,noreferrer') }],
    },
    {
      label: 'Favorites',
      items: FAVORITES.map((f) => ({ label: f.label, onClick: () => go(f.url) })),
    },
  ];

  return (
    <div className="ie">
      <MenuBar menus={menus} />
      <div className="exp-toolbar">
        <button type="button" className="tb-btn" disabled={index === 0} onClick={() => setIndex(index - 1)}><Icon name="back" size={22} /><span>Back</span></button>
        <button type="button" className="tb-btn" disabled={index >= history.length - 1} onClick={() => setIndex(index + 1)}><Icon name="forward" size={22} /></button>
        <button type="button" className="tb-btn" onClick={() => go(HOME)}><Icon name="windows" size={22} /><span>Home</span></button>
        <button type="button" className="tb-btn" disabled={url === HOME} onClick={() => { setLoading(true); setReloads((n) => n + 1); }}>Refresh</button>
      </div>
      <form
        className="exp-address"
        onSubmit={(e) => {
          e.preventDefault();
          const value = new FormData(e.currentTarget).get('address');
          go(String(value ?? ''));
        }}
      >
        <span>Address</span>
        <div className="address-box">
          <Icon name="ie" size={16} />
          <input key={url} name="address" defaultValue={url === HOME ? '' : url} placeholder="Type a web address or search" spellCheck={false} />
        </div>
        <button type="submit" className="xp-button go">Go</button>
      </form>
      <div className="ie-view">
        {url === HOME ? (
          <div className="ie-home">
            <h1>Welcome to the web</h1>
            <p>This browser is a window onto real websites. Some sites forbid being embedded in other pages; for those, use File &gt; Open in new browser tab.</p>
            <ul>
              {FAVORITES.map((f) => (
                <li key={f.url}><button type="button" className="link" onClick={() => go(f.url)}>{f.label}</button></li>
              ))}
            </ul>
          </div>
        ) : (
          <iframe
            key={`${index}-${reloads}-${url}`}
            title="Web page"
            src={url}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            referrerPolicy="no-referrer"
            onLoad={() => setLoading(false)}
          />
        )}
      </div>
      <div className="statusbar"><span>{loading ? 'Opening page...' : 'Done'}</span><span>Internet</span></div>
    </div>
  );
}
