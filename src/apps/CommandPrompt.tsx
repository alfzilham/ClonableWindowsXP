import { useEffect, useRef, useState } from 'react';
import { IDS, vfs } from '../core/vfs';
import { closeWindow, openApp, os } from '../core/os';
import { BANNER, promptFor, runCommand } from './cmdLogic';
import type { AppProps } from './types';

export function CommandPrompt({ windowId }: AppProps) {
  const [cwd, setCwd] = useState<string>(IDS.user);
  const [lines, setLines] = useState<string[]>(BANNER);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [lines]);

  const prompt = promptFor(vfs, vfs.get(cwd) ? cwd : IDS.c);

  const submit = () => {
    const line = input;
    const result = runCommand(line, vfs.get(cwd) ? cwd : IDS.c, vfs, { userName: os.get().userName, now: new Date() });
    setLines((prev) =>
      result.clear ? [] : [...prev, `${prompt}${line}`, ...result.output, ...(result.output.length > 0 ? [''] : [])],
    );
    setCwd(result.cwd);
    if (line.trim()) setHistory((h) => [...h, line]);
    setCursor(null);
    setInput('');
    if (result.launch) openApp(result.launch.appId, result.launch.props);
    if (result.exit) closeWindow(windowId);
  };

  const recall = (dir: -1 | 1) => {
    if (history.length === 0) return;
    const next = cursor === null ? (dir === -1 ? history.length - 1 : null) : Math.min(history.length, Math.max(0, cursor + dir));
    if (next === null || next >= history.length) {
      setCursor(null);
      setInput('');
    } else {
      setCursor(next);
      setInput(history[next]);
    }
  };

  return (
    <div className="cmd" onClick={() => inputRef.current?.focus()}>
      <div className="cmd-scroll">
        {lines.map((l, i) => (
          <div key={i} className="cmd-line">{l || ' '}</div>
        ))}
        <div className="cmd-line cmd-input-line">
          <span>{prompt}</span>
          <input
            ref={inputRef}
            value={input}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            aria-label="Command"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'ArrowUp') { e.preventDefault(); recall(-1); }
              if (e.key === 'ArrowDown') { e.preventDefault(); recall(1); }
            }}
          />
        </div>
        <div ref={endRef} />
      </div>
    </div>
  );
}
