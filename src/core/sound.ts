/** Tiny WebAudio synth so the project ships no audio assets. All sounds are original. */

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(value: boolean): void {
  muted = value;
}

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number): void {
  const ac = getAudioContext();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ac.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function playStartup(): void {
  if (muted) return;
  // Soft ascending arpeggio ending on a major chord.
  [392, 523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.28, 1.6, 'sine', 0.12));
  [261.63, 329.63, 392].forEach((f) => tone(f, 1.2, 2.2, 'triangle', 0.07));
}

export function playLogoff(): void {
  if (muted) return;
  [783.99, 659.25, 523.25, 392].forEach((f, i) => tone(f, i * 0.22, 1.2, 'sine', 0.1));
}

export function playError(): void {
  if (muted) return;
  tone(220, 0, 0.18, 'square', 0.08);
  tone(165, 0.16, 0.3, 'square', 0.08);
}

export function playClick(): void {
  if (muted) return;
  tone(1200, 0, 0.04, 'square', 0.03);
}

export function playNotify(): void {
  if (muted) return;
  tone(880, 0, 0.12, 'sine', 0.09);
  tone(1174.66, 0.1, 0.2, 'sine', 0.09);
}
