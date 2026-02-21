/**
 * Procedural sound manager using Web Audio API.
 * All sounds synthesized - no audio files needed.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

function getMaster(): GainNode {
  getCtx();
  return masterGain!;
}

export function resumeAudio(): void {
  const ctx = getCtx();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}

// ─── One-shot UI Sounds ────────────────────────────────────────

/** Crisp click for buttons and toggles */
export function playClick(): void {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(getMaster());
  osc.frequency.value = 1200;
  osc.type = 'square';
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
  osc.start();
  osc.stop(ctx.currentTime + 0.04);
}

/** Heavy mechanical thunk for big buttons (SCRAM, emergency) */
export function playThunk(): void {
  const ctx = getCtx();
  // Low hit
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(getMaster());
  osc.frequency.setValueAtTime(180, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.15);
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
  // Metallic click on top
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(getMaster());
  osc2.frequency.value = 3200;
  osc2.type = 'square';
  gain2.gain.setValueAtTime(0.06, ctx.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
  osc2.start();
  osc2.stop(ctx.currentTime + 0.02);
}

/** Subtle tick for slider movement (call sparingly, ~10Hz max) */
export function playSliderTick(): void {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(getMaster());
  osc.frequency.value = 2400;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.03, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);
  osc.start();
  osc.stop(ctx.currentTime + 0.015);
}

/** Mechanical switch toggle sound */
export function playSwitch(): void {
  const ctx = getCtx();
  const t = ctx.currentTime;
  // Two rapid clicks
  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(getMaster());
    osc.frequency.value = 1800 + i * 600;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.06, t + i * 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.03 + 0.02);
    osc.start(t + i * 0.03);
    osc.stop(t + i * 0.03 + 0.02);
  }
}

// ─── Game Event Sounds ─────────────────────────────────────────

/** Two-tone klaxon alarm for new events */
export function playAlarm(severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(getMaster());

  const vol = severity === 'critical' ? 0.14 : severity === 'high' ? 0.10 : severity === 'medium' ? 0.07 : 0.04;
  const lo = severity === 'critical' ? 600 : severity === 'high' ? 500 : 440;
  const hi = severity === 'critical' ? 1200 : severity === 'high' ? 950 : 880;
  const cycles = severity === 'critical' ? 4 : severity === 'high' ? 3 : 2;

  osc.type = 'sawtooth';
  gain.gain.setValueAtTime(vol, t);

  for (let i = 0; i < cycles; i++) {
    const offset = i * 0.2;
    osc.frequency.setValueAtTime(lo, t + offset);
    osc.frequency.setValueAtTime(hi, t + offset + 0.1);
  }

  const end = t + cycles * 0.2;
  gain.gain.setValueAtTime(vol, end - 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, end);
  osc.start(t);
  osc.stop(end);
}

/** Rising chime for event resolved */
export function playResolve(): void {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const notes = [660, 880, 1100]; // rising triad
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(getMaster());
    osc.frequency.value = freq;
    osc.type = 'sine';
    const start = t + i * 0.07;
    gain.gain.setValueAtTime(0.08, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
    osc.start(start);
    osc.stop(start + 0.2);
  });
}

/** Hiss sound for pressure vent */
export function playVentHiss(): void {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.6;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(6000, t);
  filter.frequency.exponentialRampToValueAtTime(2000, t + 0.6);
  filter.Q.value = 2;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(getMaster());
  source.start(t);
  source.stop(t + 0.6);
}

/** Liquid rush for coolant refill */
export function playCoolantRush(): void {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.8;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, t);
  filter.frequency.linearRampToValueAtTime(1200, t + 0.3);
  filter.frequency.linearRampToValueAtTime(600, t + 0.8);
  filter.Q.value = 5;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0, t);
  gain.gain.linearRampToValueAtTime(0.10, t + 0.1);
  gain.gain.setValueAtTime(0.10, t + 0.5);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(getMaster());
  source.start(t);
  source.stop(t + 0.8);
}

/** Metallic wrench/repair sound */
export function playRepair(): void {
  const ctx = getCtx();
  const t = ctx.currentTime;
  // Three metallic clanks
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(getMaster());
    osc.frequency.value = 800 + Math.random() * 400;
    osc.type = 'triangle';
    const start = t + i * 0.12;
    gain.gain.setValueAtTime(0.10, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);
    osc.start(start);
    osc.stop(start + 0.08);
  }
}

/** Extinguisher whoosh */
export function playExtinguish(): void {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 1.0;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(3000, t);
  filter.frequency.exponentialRampToValueAtTime(800, t + 1.0);
  filter.Q.value = 1;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0, t);
  gain.gain.linearRampToValueAtTime(0.15, t + 0.05);
  gain.gain.setValueAtTime(0.12, t + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(getMaster());
  source.start(t);
  source.stop(t + 1.0);
}

/** Electronic beep for calibration / diagnostic */
export function playBeep(): void {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(getMaster());
  osc.frequency.value = 1000;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.06, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.start(t);
  osc.stop(t + 0.08);
}

/** Multi-tone diagnostic scan */
export function playDiagnosticScan(): void {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const freqs = [800, 1000, 1200, 1400, 1600, 1400, 1200, 1000];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(getMaster());
    osc.frequency.value = freq;
    osc.type = 'sine';
    const start = t + i * 0.06;
    gain.gain.setValueAtTime(0.04, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);
    osc.start(start);
    osc.stop(start + 0.05);
  });
}

/** Shield power-up hum */
export function playShieldCharge(): void {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(getMaster());
  osc.frequency.setValueAtTime(100, t);
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.3);
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.0, t);
  gain.gain.linearRampToValueAtTime(0.07, t + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  osc.start(t);
  osc.stop(t + 0.4);
}

/** Containment restore - deep power-up */
export function playContainmentRestore(): void {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(getMaster());
  osc1.frequency.setValueAtTime(80, t);
  osc1.frequency.linearRampToValueAtTime(200, t + 0.5);
  osc1.type = 'sine';
  osc2.frequency.setValueAtTime(120, t);
  osc2.frequency.linearRampToValueAtTime(300, t + 0.5);
  osc2.type = 'triangle';
  gain.gain.setValueAtTime(0.0, t);
  gain.gain.linearRampToValueAtTime(0.08, t + 0.15);
  gain.gain.setValueAtTime(0.08, t + 0.35);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  osc1.start(t);
  osc2.start(t);
  osc1.stop(t + 0.6);
  osc2.stop(t + 0.6);
}

// ─── Phase Transition Sounds ───────────────────────────────────

/** Dramatic stinger for phase change */
export function playPhaseTransition(phase: number): void {
  const ctx = getCtx();
  const t = ctx.currentTime;

  // Descending power chord that gets darker each phase
  const baseFreq = 220 - phase * 30;
  const tones = [baseFreq, baseFreq * 1.5, baseFreq * 2];

  tones.forEach(freq => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(getMaster());
    osc.frequency.value = freq;
    osc.type = phase >= 3 ? 'sawtooth' : 'triangle';
    gain.gain.setValueAtTime(0.0, t);
    gain.gain.linearRampToValueAtTime(0.10, t + 0.05);
    gain.gain.setValueAtTime(0.10, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    osc.start(t);
    osc.stop(t + 1.2);
  });

  // Impact noise
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.08 + phase * 0.02, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  source.connect(noiseGain);
  noiseGain.connect(getMaster());
  source.start(t);
  source.stop(t + 0.3);
}

// ─── Game Over Sounds ──────────────────────────────────────────

/** Victory fanfare */
export function playVictory(): void {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const melody = [523, 659, 784, 1047]; // C5 E5 G5 C6
  melody.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(getMaster());
    osc.frequency.value = freq;
    osc.type = 'sine';
    const start = t + i * 0.15;
    const dur = i === melody.length - 1 ? 0.6 : 0.15;
    gain.gain.setValueAtTime(0.12, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.start(start);
    osc.stop(start + dur);
  });
}

/** Meltdown explosion */
export function playMeltdown(): void {
  const ctx = getCtx();
  const t = ctx.currentTime;

  // Deep boom
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(getMaster());
  osc.frequency.setValueAtTime(80, t);
  osc.frequency.exponentialRampToValueAtTime(20, t + 1.5);
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
  osc.start(t);
  osc.stop(t + 1.5);

  // Explosion noise
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const env = Math.exp(-i / (ctx.sampleRate * 0.4));
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(4000, t);
  filter.frequency.exponentialRampToValueAtTime(200, t + 2.0);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.18, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
  source.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(getMaster());
  source.start(t);
  source.stop(t + 2.0);
}

// ─── Geiger Counter Crackle ────────────────────────────────────

let geigerTimer: ReturnType<typeof setTimeout> | null = null;

/** Start Geiger crackle that intensifies with radiation level (0-100) */
export function updateGeigerIntensity(radiation: number): void {
  // Let the ambient system handle scheduling
  // This is called from the hook - we just fire individual ticks
  if (radiation < 15) return;
  const ctx = getCtx();
  const t = ctx.currentTime;

  const bufferSize = Math.floor(ctx.sampleRate * 0.008);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  const vol = 0.02 + (radiation / 100) * 0.06;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.008);
  source.connect(gain);
  gain.connect(getMaster());
  source.start(t);
  source.stop(t + 0.008);
}

// ─── Continuous Ambient System ─────────────────────────────────

interface AmbientState {
  droneOsc1: OscillatorNode | null;
  droneOsc2: OscillatorNode | null;
  droneGain: GainNode | null;
  droneFilter: BiquadFilterNode | null;
  running: boolean;
  geigerInterval: ReturnType<typeof setInterval> | null;
}

const ambient: AmbientState = {
  droneOsc1: null,
  droneOsc2: null,
  droneGain: null,
  droneFilter: null,
  running: false,
  geigerInterval: null,
};

/** Start the ambient drone. Call once when game starts. */
export function startAmbient(): void {
  if (ambient.running) return;
  const ctx = getCtx();

  ambient.droneOsc1 = ctx.createOscillator();
  ambient.droneOsc2 = ctx.createOscillator();
  ambient.droneFilter = ctx.createBiquadFilter();
  ambient.droneGain = ctx.createGain();

  ambient.droneOsc1.connect(ambient.droneFilter);
  ambient.droneOsc2.connect(ambient.droneFilter);
  ambient.droneFilter.connect(ambient.droneGain);
  ambient.droneGain.connect(getMaster());

  ambient.droneOsc1.frequency.value = 55;
  ambient.droneOsc1.type = 'sine';
  ambient.droneOsc2.frequency.value = 82.4;
  ambient.droneOsc2.type = 'sine';

  ambient.droneFilter.type = 'lowpass';
  ambient.droneFilter.frequency.value = 200;

  ambient.droneGain.gain.value = 0.025;

  ambient.droneOsc1.start();
  ambient.droneOsc2.start();
  ambient.running = true;
}

/**
 * Update ambient parameters based on reactor danger level.
 * Call every ~500ms from the game state hook.
 * danger: 0 (calm) to 1 (critical)
 * radiation: 0-100
 */
export function updateAmbient(danger: number, radiation: number): void {
  if (!ambient.running) return;
  const ctx = getCtx();
  const t = ctx.currentTime;

  // Drone gets louder and higher-pass as danger rises
  if (ambient.droneGain) {
    ambient.droneGain.gain.linearRampToValueAtTime(0.025 + danger * 0.04, t + 0.5);
  }
  if (ambient.droneFilter) {
    ambient.droneFilter.frequency.linearRampToValueAtTime(200 + danger * 1000, t + 0.5);
  }
  // Detune for unease
  if (ambient.droneOsc2) {
    ambient.droneOsc2.detune.linearRampToValueAtTime(danger * 30, t + 0.5);
  }

  // Geiger crackle scheduling
  if (ambient.geigerInterval) {
    clearInterval(ambient.geigerInterval);
    ambient.geigerInterval = null;
  }
  if (radiation > 15) {
    const interval = Math.max(50, 500 - radiation * 4); // faster ticks at higher radiation
    ambient.geigerInterval = setInterval(() => {
      if (Math.random() < 0.6) {
        updateGeigerIntensity(radiation);
      }
    }, interval);
  }
}

/** Stop ambient drone. Call when game ends or player leaves. */
export function stopAmbient(): void {
  if (!ambient.running) return;
  const ctx = getCtx();
  const t = ctx.currentTime;

  if (ambient.droneGain) {
    ambient.droneGain.gain.linearRampToValueAtTime(0.001, t + 0.5);
  }
  if (ambient.geigerInterval) {
    clearInterval(ambient.geigerInterval);
    ambient.geigerInterval = null;
  }

  setTimeout(() => {
    ambient.droneOsc1?.stop();
    ambient.droneOsc2?.stop();
    ambient.droneOsc1 = null;
    ambient.droneOsc2 = null;
    ambient.droneGain = null;
    ambient.droneFilter = null;
    ambient.running = false;
  }, 600);
}

// ─── Klaxon (looping critical alarm) ───────────────────────────

let klaxonOsc: OscillatorNode | null = null;
let klaxonGain: GainNode | null = null;
let klaxonLfo: OscillatorNode | null = null;

/** Start looping klaxon for critical state. Idempotent. */
export function startKlaxon(): void {
  if (klaxonOsc) return;
  const ctx = getCtx();
  const t = ctx.currentTime;

  klaxonOsc = ctx.createOscillator();
  klaxonGain = ctx.createGain();
  klaxonLfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  // LFO modulates the klaxon frequency
  klaxonLfo.frequency.value = 2; // 2Hz wobble
  klaxonLfo.connect(lfoGain);
  lfoGain.gain.value = 200;
  lfoGain.connect(klaxonOsc.frequency);

  klaxonOsc.frequency.value = 600;
  klaxonOsc.type = 'sawtooth';
  klaxonOsc.connect(klaxonGain);
  klaxonGain.connect(getMaster());

  klaxonGain.gain.setValueAtTime(0.0, t);
  klaxonGain.gain.linearRampToValueAtTime(0.06, t + 0.3);

  klaxonOsc.start(t);
  klaxonLfo.start(t);
}

/** Stop klaxon. */
export function stopKlaxon(): void {
  if (!klaxonOsc || !klaxonGain) return;
  const ctx = getCtx();
  const t = ctx.currentTime;

  klaxonGain.gain.linearRampToValueAtTime(0.001, t + 0.3);
  const oscRef = klaxonOsc;
  const lfoRef = klaxonLfo;
  setTimeout(() => {
    oscRef?.stop();
    lfoRef?.stop();
  }, 400);
  klaxonOsc = null;
  klaxonGain = null;
  klaxonLfo = null;
}
