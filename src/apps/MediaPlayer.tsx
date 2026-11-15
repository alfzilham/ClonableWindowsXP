import { useCallback, useEffect, useRef, useState } from 'react';
import { closeWindow, os } from '../core/os';
import { useStore } from '../core/store';
import { getAudioContext } from '../core/sound';
import { synthesizeDemoWav } from '../core/wav';
import { MenuBar, type Menu } from './shared/MenuBar';
import type { AppProps } from './types';

interface Track {
  id: number;
  name: string;
  url: string;
}

const fmt = (s: number) => {
  if (!Number.isFinite(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

export function MediaPlayer({ windowId }: AppProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const urlsRef = useRef<string[]>([]);
  const idRef = useRef(0);
  const muted = useStore(os, (s) => s.muted);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  const addTrack = useCallback((name: string, url: string) => {
    urlsRef.current.push(url);
    const track = { id: ++idRef.current, name, url };
    setTracks((t) => [...t, track]);
    return track;
  }, []);

  const addDemo = useCallback(() => {
    const blob = new Blob([synthesizeDemoWav() as BlobPart], { type: 'audio/wav' });
    return addTrack('Demo melody (generated)', URL.createObjectURL(blob));
  }, [addTrack]);

  // Seed the playlist with the generated demo track.
  useEffect(() => {
    const urls = urlsRef.current;
    const first = addDemo();
    setCurrent(first.id);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [addDemo]);

  const track = tracks.find((t) => t.id === current) ?? null;

  const connectAnalyser = () => {
    const audio = audioRef.current;
    const ac = getAudioContext();
    if (!audio || !ac || analyserRef.current) return;
    const source = ac.createMediaElementSource(audio);
    const analyser = ac.createAnalyser();
    analyser.fftSize = 128;
    source.connect(analyser);
    analyser.connect(ac.destination);
    analyserRef.current = analyser;
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
  }, [volume, muted]);

  // Visualizer loop
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      const c = canvas?.getContext('2d');
      if (!canvas || !c) return;
      c.fillStyle = '#05101f';
      c.fillRect(0, 0, canvas.width, canvas.height);
      const analyser = analyserRef.current;
      const bins = analyser ? new Uint8Array(analyser.frequencyBinCount) : new Uint8Array(32);
      analyser?.getByteFrequencyData(bins);
      const barW = canvas.width / bins.length;
      bins.forEach((v, i) => {
        const h = (v / 255) * canvas.height;
        const grad = c.createLinearGradient(0, canvas.height, 0, canvas.height - h);
        grad.addColorStop(0, '#1d6fd8');
        grad.addColorStop(1, '#6ef0ff');
        c.fillStyle = grad;
        c.fillRect(i * barW + 1, canvas.height - h, barW - 2, h);
      });
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  const play = async () => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    connectAnalyser();
    try {
      await audio.play();
    } catch {
      /* autoplay blocked or the file cannot be decoded */
    }
  };
  const pause = () => audioRef.current?.pause();
  const stop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setTime(0);
  };
  const step = (dir: 1 | -1) => {
    if (!tracks.length) return;
    const i = tracks.findIndex((t) => t.id === current);
    const next = tracks[(i + dir + tracks.length) % tracks.length];
    setCurrent(next.id);
    window.setTimeout(() => void play(), 0);
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    let firstId: number | null = null;
    Array.from(files).forEach((f) => {
      const t = addTrack(f.name, URL.createObjectURL(f));
      firstId ??= t.id;
    });
    if (firstId !== null) {
      setCurrent(firstId);
      window.setTimeout(() => void play(), 50);
    }
  };

  const menus: Menu[] = [
    {
      label: 'File',
      items: [
        { label: 'Open...', onClick: () => fileRef.current?.click() },
        { label: 'Add demo melody', onClick: () => { const t = addDemo(); setCurrent(t.id); } },
        { separator: true },
        { label: 'Exit', onClick: () => closeWindow(windowId) },
      ],
    },
  ];

  return (
    <div className="wmp">
      <MenuBar menus={menus} />
      <div className="wmp-main">
        <div className="wmp-stage">
          <canvas ref={canvasRef} width={360} height={200} className="wmp-viz" />
          <div className="wmp-now">{track ? track.name : 'No media loaded'}</div>
        </div>
        <ul className="wmp-playlist" aria-label="Now Playing">
          {tracks.map((t) => (
            <li key={t.id}>
              <button type="button" className={t.id === current ? 'on' : ''} onClick={() => { setCurrent(t.id); window.setTimeout(() => void play(), 0); }}>{t.name}</button>
            </li>
          ))}
        </ul>
      </div>
      <audio
        ref={audioRef}
        src={track?.url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => step(1)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      <div className="wmp-controls">
        <input
          type="range"
          className="wmp-seek"
          min={0}
          max={duration || 0}
          step={0.1}
          value={time}
          aria-label="Seek"
          onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }}
        />
        <div className="wmp-row">
          <button type="button" className="wmp-btn" onClick={() => (playing ? pause() : void play())} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
          <button type="button" className="wmp-btn" onClick={stop} aria-label="Stop">{'■'}</button>
          <button type="button" className="wmp-btn" onClick={() => step(-1)} aria-label="Previous">{'◀◀'}</button>
          <button type="button" className="wmp-btn" onClick={() => step(1)} aria-label="Next">{'▶▶'}</button>
          <span className="wmp-time">{fmt(time)} / {fmt(duration)}</span>
          <input type="range" className="wmp-vol" min={0} max={1} step={0.05} value={volume} aria-label="Volume" onChange={(e) => setVolume(Number(e.target.value))} />
        </div>
      </div>
      <input ref={fileRef} type="file" accept="audio/*" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
