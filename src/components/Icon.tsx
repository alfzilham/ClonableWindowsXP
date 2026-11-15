import type { ReactNode } from 'react';
import xpLogo from '../assets/xp-logo.webp';

export type IconName =
  | 'computer' | 'folder' | 'folderOpen' | 'document' | 'notepad' | 'paint' | 'calculator'
  | 'mine' | 'cards' | 'ie' | 'media' | 'cmd' | 'control' | 'recycle' | 'recycleFull' | 'drive'
  | 'image' | 'music' | 'logoff' | 'power' | 'run' | 'user' | 'warning' | 'error' | 'info'
  | 'search' | 'help' | 'taskmgr' | 'display' | 'sound' | 'windows' | 'back' | 'forward' | 'up';

/** Original, simple SVG glyphs drawn on a 32x32 grid. */
const GLYPHS: Record<IconName, ReactNode> = {
  computer: (
    <>
      <rect x="4" y="4" width="24" height="17" rx="2" fill="#d4dae6" stroke="#4a5a7a" />
      <rect x="6.5" y="6.5" width="19" height="12" fill="#3b82d6" />
      <path d="M6.5 14 Q14 8 25.5 12 V18.5 H6.5Z" fill="#5fb85a" />
      <rect x="12" y="22" width="8" height="3" fill="#9aa5bb" />
      <rect x="8" y="25" width="16" height="3" rx="1" fill="#c6cddc" stroke="#4a5a7a" />
    </>
  ),
  folder: (
    <>
      <path d="M3 8h9l3 3h14v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="#f2c94c" stroke="#b58a12" />
      <path d="M3 13h26v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="#f9dd7b" stroke="#b58a12" />
    </>
  ),
  folderOpen: (
    <>
      <path d="M3 8h9l3 3h12v4H3z" fill="#e0b43a" stroke="#b58a12" />
      <path d="M2 27l4-12h24l-4 12z" fill="#f9dd7b" stroke="#b58a12" />
    </>
  ),
  document: (
    <>
      <path d="M7 3h13l6 6v20H7z" fill="#fff" stroke="#6b7b99" />
      <path d="M20 3v6h6" fill="#dfe6f3" stroke="#6b7b99" />
      <path d="M10 14h12M10 18h12M10 22h8" stroke="#8aa0c8" />
    </>
  ),
  notepad: (
    <>
      <rect x="6" y="4" width="20" height="25" rx="1.5" fill="#fffbe0" stroke="#6b7b99" />
      <rect x="6" y="4" width="20" height="5" fill="#3a78d4" />
      <path d="M9 13h14M9 17h14M9 21h14M9 25h9" stroke="#7aa0d8" />
    </>
  ),
  paint: (
    <>
      <path d="M16 4C8 4 3 10 3 16c0 6 5 11 11 11 3 0 3-3 1-4-2-2 0-4 3-4h5c3 0 6-1 6-4 0-6-6-11-13-11z" fill="#f4e2b8" stroke="#8a6a2a" />
      <circle cx="10" cy="12" r="2.2" fill="#e8472b" />
      <circle cx="16" cy="9" r="2.2" fill="#2f7be0" />
      <circle cx="22" cy="12" r="2.2" fill="#3fb34f" />
      <circle cx="9" cy="19" r="2.2" fill="#f5c518" />
    </>
  ),
  calculator: (
    <>
      <rect x="6" y="3" width="20" height="26" rx="2" fill="#c9d3e6" stroke="#4a5a7a" />
      <rect x="9" y="6" width="14" height="6" fill="#cfe9c0" stroke="#4a5a7a" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={9 + c * 5} y={15 + r * 5} width="4" height="4" rx="0.8" fill="#fff" stroke="#4a5a7a" strokeWidth="0.6" />),
      )}
    </>
  ),
  mine: (
    <>
      <circle cx="16" cy="16" r="8" fill="#222" />
      <path d="M16 4v6M16 22v6M4 16h6M22 16h6M7.5 7.5l4 4M20.5 20.5l4 4M24.5 7.5l-4 4M11.5 20.5l-4 4" stroke="#222" strokeWidth="2" />
      <circle cx="13" cy="13" r="2" fill="#fff" />
    </>
  ),
  cards: (
    <>
      <rect x="4" y="6" width="15" height="21" rx="2" fill="#fff" stroke="#4a5a7a" transform="rotate(-10 11 16)" />
      <rect x="13" y="5" width="15" height="21" rx="2" fill="#fff" stroke="#4a5a7a" transform="rotate(8 20 15)" />
      <path d="M20.5 20c-4-3-4-6-1.5-6.5 1.2 0 1.8.8 1.5 1.5.3-.7.9-1.5 2-1.5 2.5.5 2.5 3.500-2 6.500z" fill="#d6281b" />
    </>
  ),
  ie: (
    <>
      <circle cx="16" cy="16" r="10" fill="#4aa3f0" stroke="#1d5fa8" />
      <path d="M8 18h16c0-6-4-9-8-9s-7 3-8 6" fill="none" stroke="#fff" strokeWidth="3" />
      <path d="M26 6c-5-3-18 4-20 18" fill="none" stroke="#f5c518" strokeWidth="2" />
    </>
  ),
  media: (
    <>
      <circle cx="16" cy="16" r="12" fill="#f3871d" stroke="#a24a00" />
      <circle cx="16" cy="16" r="8" fill="#fff" />
      <path d="M13 11l9 5-9 5z" fill="#2f7be0" />
    </>
  ),
  cmd: (
    <>
      <rect x="3" y="5" width="26" height="22" rx="2" fill="#111" stroke="#666" />
      <path d="M7 12l5 4-5 4" fill="none" stroke="#ddd" strokeWidth="2" />
      <path d="M14 21h8" stroke="#ddd" strokeWidth="2" />
    </>
  ),
  control: (
    <>
      <rect x="4" y="5" width="24" height="22" rx="2" fill="#dbe4f5" stroke="#4a5a7a" />
      <circle cx="12" cy="14" r="4" fill="#fff" stroke="#3a78d4" strokeWidth="2" />
      <circle cx="21" cy="19" r="4" fill="#fff" stroke="#e08a1e" strokeWidth="2" />
    </>
  ),
  recycle: (
    <>
      <path d="M8 9h16l-2 18H10z" fill="#cfd8e8" stroke="#4a5a7a" />
      <path d="M6 9h20M13 5h6v4h-6z" fill="none" stroke="#4a5a7a" strokeWidth="1.5" />
      <path d="M13 13v11M16 13v11M19 13v11" stroke="#8aa0c8" />
    </>
  ),
  recycleFull: (
    <>
      <path d="M8 11h16l-2 16H10z" fill="#cfd8e8" stroke="#4a5a7a" />
      <path d="M6 11h20" stroke="#4a5a7a" strokeWidth="1.5" />
      <path d="M9 11l3-6 4 5 3-6 4 7" fill="#fffbe0" stroke="#8a8a60" />
    </>
  ),
  drive: (
    <>
      <rect x="3" y="10" width="26" height="12" rx="2" fill="#c9d3e6" stroke="#4a5a7a" />
      <rect x="6" y="15" width="14" height="2" fill="#6b7b99" />
      <circle cx="25" cy="16" r="1.5" fill="#5fb85a" />
    </>
  ),
  image: (
    <>
      <rect x="4" y="6" width="24" height="20" fill="#fff" stroke="#4a5a7a" />
      <rect x="6" y="8" width="20" height="16" fill="#8cc4f2" />
      <path d="M6 24l7-8 5 5 3-3 5 6z" fill="#4c9a3f" />
      <circle cx="21" cy="12" r="2.5" fill="#f8e060" />
    </>
  ),
  music: (
    <>
      <path d="M12 22V8l13-3v14" fill="none" stroke="#2f5db0" strokeWidth="2" />
      <ellipse cx="9.500" cy="22.500" rx="3.500" ry="2.800" fill="#2f5db0" />
      <ellipse cx="22.500" cy="19.500" rx="3.500" ry="2.800" fill="#2f5db0" />
    </>
  ),
  logoff: (
    <>
      <rect x="5" y="4" width="14" height="24" rx="1" fill="#e8d4a2" stroke="#7a5a1a" />
      <path d="M14 16h13M23 11l5 5-5 5" fill="none" stroke="#2f7be0" strokeWidth="2.500" />
    </>
  ),
  power: (
    <>
      <circle cx="16" cy="17" r="10" fill="#d6281b" stroke="#7a1208" />
      <path d="M16 8v9" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M10.500 12a8 8 0 1 0 11 0" fill="none" stroke="#fff" strokeWidth="2.500" strokeLinecap="round" />
    </>
  ),
  run: (
    <>
      <rect x="3" y="6" width="26" height="20" rx="2" fill="#dbe4f5" stroke="#4a5a7a" />
      <rect x="3" y="6" width="26" height="5" fill="#3a78d4" />
      <path d="M8 17l4 3-4 3M15 23h8" fill="none" stroke="#333" strokeWidth="1.800" />
    </>
  ),
  user: (
    <>
      <circle cx="16" cy="11" r="6" fill="#f2c9a0" stroke="#8a5a2a" />
      <path d="M4 29c0-8 5-12 12-12s12 4 12 12z" fill="#3a78d4" stroke="#1d4f98" />
    </>
  ),
  warning: (
    <>
      <path d="M16 3L30 28H2z" fill="#f5c518" stroke="#8a6a00" strokeWidth="1.500" strokeLinejoin="round" />
      <path d="M16 12v8" stroke="#222" strokeWidth="3" strokeLinecap="round" />
      <circle cx="16" cy="24" r="1.800" fill="#222" />
    </>
  ),
  error: (
    <>
      <circle cx="16" cy="16" r="13" fill="#d6281b" stroke="#7a1208" strokeWidth="1.500" />
      <path d="M10 10l12 12M22 10L10 22" stroke="#fff" strokeWidth="3.500" strokeLinecap="round" />
    </>
  ),
  info: (
    <>
      <circle cx="16" cy="16" r="13" fill="#2f7be0" stroke="#1d4f98" strokeWidth="1.500" />
      <circle cx="16" cy="9.500" r="2" fill="#fff" />
      <path d="M16 14v10" stroke="#fff" strokeWidth="3.500" strokeLinecap="round" />
    </>
  ),
  search: (
    <>
      <circle cx="13" cy="13" r="8" fill="#e6f2ff" stroke="#2f5db0" strokeWidth="2" />
      <path d="M19 19l9 9" stroke="#7a5a1a" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  help: (
    <>
      <circle cx="16" cy="16" r="13" fill="#3a78d4" stroke="#1d4f98" strokeWidth="1.500" />
      <path d="M11 12.500a5 5 0 0 1 10 0c0 3-5 3.500-5 7" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="16" cy="24" r="1.800" fill="#fff" />
    </>
  ),
  taskmgr: (
    <>
      <rect x="3" y="5" width="26" height="22" rx="2" fill="#fff" stroke="#4a5a7a" />
      <path d="M5 21l5-6 4 4 5-9 4 5 4-2" fill="none" stroke="#2f9e44" strokeWidth="2" />
    </>
  ),
  display: (
    <>
      <rect x="3" y="4" width="26" height="18" rx="2" fill="#d4dae6" stroke="#4a5a7a" />
      <rect x="5.500" y="6.500" width="21" height="13" fill="#5fb0f0" />
      <path d="M5.500 16Q13 11 26.500 15V19.500H5.500Z" fill="#5fb85a" />
      <rect x="11" y="24" width="10" height="3" fill="#9aa5bb" />
    </>
  ),
  sound: (
    <>
      <path d="M4 12h6l7-6v20l-7-6H4z" fill="#9aa5bb" stroke="#4a5a7a" />
      <path d="M21 11a7 7 0 0 1 0 10M24 7a12 12 0 0 1 0 18" fill="none" stroke="#2f7be0" strokeWidth="2" />
    </>
  ),
  windows: (
    <>
      <path d="M4 8q6-3 11 0v8q-5-3-11 0z" fill="#e8472b" />
      <path d="M17 9q6 3 11 0v8q-5 3-11 0z" fill="#6cc04a" />
      <path d="M4 18q6-3 11 0v8q-5-3-11 0z" fill="#2f7be0" />
      <path d="M17 19q6 3 11 0v8q-5 3-11 0z" fill="#f5c518" />
    </>
  ),
  back: (
    <>
      <circle cx="16" cy="16" r="12" fill="#3fb34f" stroke="#1d7a2a" />
      <path d="M19 9l-8 7 8 7" fill="none" stroke="#fff" strokeWidth="3.500" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  forward: (
    <>
      <circle cx="16" cy="16" r="12" fill="#3fb34f" stroke="#1d7a2a" />
      <path d="M13 9l8 7-8 7" fill="none" stroke="#fff" strokeWidth="3.500" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  up: (
    <>
      <path d="M4 10h9l3 3h12v14H4z" fill="#f2c94c" stroke="#b58a12" />
      <path d="M16 24V15M12 18l4-4 4 4" fill="none" stroke="#1d7a2a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 32, className }: IconProps) {
  if (name === 'windows') {
    return <img className={className} src={xpLogo} width={size} height={size} alt="" draggable={false} style={{ objectFit: 'contain' }} />;
  }
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      strokeWidth="1"
      strokeLinejoin="round"
    >
      {GLYPHS[name]}
    </svg>
  );
}
