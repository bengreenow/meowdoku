let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(type: OscillatorType, from: number, to: number, start: number, length: number, volume: number) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + length);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + length + 0.02);
}

/** A sawtooth swept through a moving band-pass reads surprisingly like a small cat. */
function meow(start: number, pitch: number, length: number, volume = 0.18) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const filter = a.createBiquadFilter();
  const gain = a.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(pitch * 0.8, t);
  osc.frequency.linearRampToValueAtTime(pitch * 1.25, t + length * 0.35);
  osc.frequency.linearRampToValueAtTime(pitch * 0.7, t + length);
  filter.type = "bandpass";
  filter.Q.value = 6;
  filter.frequency.setValueAtTime(700, t);
  filter.frequency.linearRampToValueAtTime(1800, t + length * 0.4);
  filter.frequency.linearRampToValueAtTime(600, t + length);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.04);
  gain.gain.setValueAtTime(volume, t + length * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(filter).connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + length + 0.05);
}

export const sfx = {
  cross: () => tone("triangle", 900, 500, 0, 0.06, 0.08),
  clear: () => tone("triangle", 500, 300, 0, 0.05, 0.05),
  cat: () => {
    tone("sine", 420, 980, 0, 0.12, 0.2);
    meow(0.04, 520 + Math.random() * 120, 0.22, 0.1);
  },
  wrong: () => {
    tone("square", 220, 110, 0, 0.25, 0.08);
    tone("sawtooth", 160, 90, 0.05, 0.3, 0.05);
  },
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone("triangle", f, f * 1.01, i * 0.09, 0.35, 0.14));
    meow(0.45, 480, 0.55);
  },
  lose: () => meow(0, 300, 0.8, 0.2),
};
