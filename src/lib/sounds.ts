/**
 * Lightweight notification sounds using the Web Audio API (no asset files).
 * - incoming: a pleasant two-chime (email-arrived)
 * - sent:     a short success blip
 * - error:    a low buzz (optional)
 *
 * The AudioContext is created lazily and unlocked on the first user gesture
 * (autoplay policy). A "sounds" preference is stored in localStorage
 * ('ls_sounds' = 'off' disables; default on).
 */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      const Ctor = window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Call on first user interaction so later sounds are allowed to play. */
export function unlockAudio(): void {
  getCtx();
}

export function soundsEnabled(): boolean {
  try {
    return localStorage.getItem('ls_sounds') !== 'off';
  } catch {
    return true;
  }
}

export function setSoundsEnabled(on: boolean): void {
  try {
    localStorage.setItem('ls_sounds', on ? 'on' : 'off');
  } catch { /* ignore */ }
}

function tone(
  c: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = 'sine',
  vol = 0.08
): void {
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  } catch { /* ignore */ }
}

/** Two ascending chimes — a new email arrived. */
export function playIncomingSound(): void {
  if (!soundsEnabled()) return;
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  tone(c, 880, t, 0.12);
  tone(c, 1174.66, t + 0.14, 0.22);
}

/** Short success blip — email sent. */
export function playSentSound(): void {
  if (!soundsEnabled()) return;
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  tone(c, 660, t, 0.1);
  tone(c, 990, t + 0.12, 0.18);
}

/** Low buzz — an error. */
export function playErrorSound(): void {
  if (!soundsEnabled()) return;
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  tone(c, 220, t, 0.25, 'triangle', 0.06);
}
