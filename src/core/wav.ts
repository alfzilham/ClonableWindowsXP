/** Synthesises a short original melody as a 16-bit mono WAV file (no audio assets shipped). */

const MELODY_HZ = [
  261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 392.0,
  440.0, 523.25, 659.25, 523.25, 440.0, 392.0, 329.63, 293.66,
  261.63, 392.0, 523.25, 392.0, 329.63, 392.0, 261.63, 0,
];

export const NOTE_SECONDS = 0.5;

export function synthesizeDemoWav(sampleRate = 22050): Uint8Array {
  const total = Math.floor(MELODY_HZ.length * NOTE_SECONDS * sampleRate);
  const buffer = new ArrayBuffer(44 + total * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeText(0, 'RIFF');
  view.setUint32(4, 36 + total * 2, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, total * 2, true);

  const perNote = Math.floor(NOTE_SECONDS * sampleRate);
  for (let i = 0; i < total; i++) {
    const hz = MELODY_HZ[Math.min(MELODY_HZ.length - 1, Math.floor(i / perNote))];
    const t = (i % perNote) / sampleRate;
    const env = Math.exp(-4.5 * t) * Math.min(1, t * 200);
    const wave = Math.sin(2 * Math.PI * hz * t) + 0.35 * Math.sin(4 * Math.PI * hz * t);
    const sample = hz === 0 ? 0 : wave * env * 0.35;
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 32767, true);
  }
  return new Uint8Array(buffer);
}
