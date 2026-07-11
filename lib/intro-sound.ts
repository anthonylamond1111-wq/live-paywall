let played = false;

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  return new Ctx();
}

function scheduleHit(ctx: AudioContext, startAt: number) {
  const punchOsc = ctx.createOscillator();
  const punchGain = ctx.createGain();
  punchOsc.type = 'sine';
  punchOsc.frequency.setValueAtTime(110, startAt);
  punchOsc.frequency.exponentialRampToValueAtTime(48, startAt + 0.2);
  punchGain.gain.setValueAtTime(0.0001, startAt);
  punchGain.gain.exponentialRampToValueAtTime(0.55, startAt + 0.02);
  punchGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.45);
  punchOsc.connect(punchGain);
  punchGain.connect(ctx.destination);
  punchOsc.start(startAt);
  punchOsc.stop(startAt + 0.48);

  const stingOsc = ctx.createOscillator();
  const stingGain = ctx.createGain();
  stingOsc.type = 'sawtooth';
  stingOsc.frequency.setValueAtTime(1200, startAt + 0.05);
  stingOsc.frequency.exponentialRampToValueAtTime(180, startAt + 0.65);
  stingGain.gain.setValueAtTime(0.0001, startAt + 0.05);
  stingGain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.08);
  stingGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.7);
  stingOsc.connect(stingGain);
  stingGain.connect(ctx.destination);
  stingOsc.start(startAt + 0.05);
  stingOsc.stop(startAt + 0.75);

  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = 'square';
  subOsc.frequency.setValueAtTime(55, startAt);
  subGain.gain.setValueAtTime(0.0001, startAt);
  subGain.gain.exponentialRampToValueAtTime(0.08, startAt + 0.03);
  subGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.25);
  subOsc.connect(subGain);
  subGain.connect(ctx.destination);
  subOsc.start(startAt);
  subOsc.stop(startAt + 0.28);
}

/** Fight-night impact — must run from a tap/click for mobile browsers. */
export async function playBrandIntroSound(fromUserGesture = false): Promise<boolean> {
  if (played) return true;

  const ctx = createAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    if (ctx.state !== 'running') {
      if (!fromUserGesture) return false;
      await ctx.resume();
    }

    if (ctx.state !== 'running') return false;

    scheduleHit(ctx, ctx.currentTime + 0.02);
    played = true;

    window.setTimeout(() => {
      void ctx.close();
    }, 1200);

    return true;
  } catch {
    return false;
  }
}

export function hasIntroSoundPlayed() {
  return played;
}

export function resetIntroSoundForTesting() {
  played = false;
}
