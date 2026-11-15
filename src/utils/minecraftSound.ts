let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let lastPlayAt = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
    return noiseBuffer;
  }
  const length = Math.floor(ctx.sampleRate * 0.04);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.25));
  }
  noiseBuffer = buffer;
  return buffer;
}

function triggerClickNodes(ctx: AudioContext, pitchMultiplier: number) {
  const now = ctx.currentTime;

  // 1. Short percussive body transient (classic blocky UI click)
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(820 * pitchMultiplier, now);
  osc.frequency.exponentialRampToValueAtTime(195 * pitchMultiplier, now + 0.026);

  oscGain.gain.setValueAtTime(0.001, now);
  oscGain.gain.linearRampToValueAtTime(0.24, now + 0.002);
  oscGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.032);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.035);

  // 2. Dry wooden/stone crisp snap via bandpass noise burst
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1850 * pitchMultiplier, now);
  filter.Q.setValueAtTime(2.0, now);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.2, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.025);
}

export function playMinecraftClick(variant: 'primary' | 'soft' = 'primary') {
  const nowMs = performance.now();
  if (nowMs - lastPlayAt < 35) return;
  lastPlayAt = nowMs;

  const ctx = getAudioContext();
  if (!ctx) return;

  const basePitch = variant === 'soft' ? 1.12 : 0.98;
  const jitter = 0.97 + Math.random() * 0.06;
  const pitchMultiplier = basePitch * jitter;

  if (ctx.state === 'suspended') {
    void ctx.resume().then(() => {
      triggerClickNodes(ctx, pitchMultiplier);
    });
    return;
  }

  triggerClickNodes(ctx, pitchMultiplier);
}
