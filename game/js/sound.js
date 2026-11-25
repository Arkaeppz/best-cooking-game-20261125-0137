// sound.js — a tiny WebAudio synth for Sizzle & Serve. Every sound is made in
// code (oscillators and filtered noise), so the game needs no audio files and
// stays fully offline. Sounds are short, quiet and tied to kitchen actions:
// a knife knock, a stove sizzle, the service bell, a sad buzz for a lost order.

let audioContext = null;

function context() {
  if (!audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function tone(freqFrom, freqTo, seconds, type = 'sine', gainPeak = 0.08) {
  const ctx = context();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  osc.type = type;
  osc.frequency.setValueAtTime(freqFrom, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(freqTo, 1), now + seconds);
  gain.gain.setValueAtTime(gainPeak, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + seconds);
}

function noiseBurst(seconds, filterFreq, gainPeak = 0.05) {
  const ctx = context();
  if (!ctx) return;
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(gainPeak, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(now);
}

export const sound = {
  pickup() { tone(500, 700, 0.07, 'triangle', 0.05); },
  chop() { noiseBurst(0.06, 900, 0.09); tone(180, 90, 0.06, 'square', 0.04); },
  sizzle() { noiseBurst(0.35, 3200, 0.035); },
  plated() { tone(660, 880, 0.09, 'triangle', 0.06); },
  bell() { tone(1318, 1318, 0.16, 'sine', 0.07); setTimeout(() => tone(1568, 1568, 0.22, 'sine', 0.06), 90); },
  buzz() { tone(160, 110, 0.28, 'sawtooth', 0.06); },
  pop() { tone(300, 900, 0.08, 'sine', 0.05); },
};
