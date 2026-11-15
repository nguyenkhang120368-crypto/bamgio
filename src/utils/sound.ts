let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playTone(freq: number, durationMs: number, volume = 0.08, type: OscillatorType = 'sine') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // Ignore audio errors if blocked by browser autoplay policy
  }
}

export function playInspectionCue(seconds: 8 | 12 | 15) {
  if (seconds === 8) {
    playTone(587.33, 140, 0.08, 'triangle');
  } else if (seconds === 12) {
    playTone(783.99, 120, 0.1, 'triangle');
    setTimeout(() => playTone(783.99, 120, 0.1, 'triangle'), 160);
  } else {
    playTone(330, 260, 0.1, 'sawtooth');
  }
}

export function playRecordChime() {
  playTone(659.25, 110, 0.06, 'sine');
  setTimeout(() => playTone(880, 180, 0.07, 'sine'), 110);
}
