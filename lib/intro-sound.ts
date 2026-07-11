import { INTRO_SOUND_URL, INTRO_SOUND_VOLUME } from '@/lib/constants';

let played = false;
let preloadedAudio: HTMLAudioElement | null = null;
let customSoundAvailable: boolean | null = null;

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  return new Ctx();
}

/** Call on intro mount so your file is ready when the user taps. */
export function preloadIntroSound() {
  if (typeof window === 'undefined' || !INTRO_SOUND_URL || preloadedAudio) return;

  const audio = new Audio(INTRO_SOUND_URL);
  audio.preload = 'auto';
  audio.volume = INTRO_SOUND_VOLUME;
  audio.addEventListener(
    'canplaythrough',
    () => {
      customSoundAvailable = true;
    },
    { once: true }
  );
  audio.addEventListener(
    'error',
    () => {
      customSoundAvailable = false;
    },
    { once: true }
  );
  audio.load();
  preloadedAudio = audio;
}

async function playCustomIntroSound(fromUserGesture: boolean): Promise<boolean> {
  if (!INTRO_SOUND_URL) return false;
  if (customSoundAvailable === false) return false;

  const audio = preloadedAudio ?? new Audio(INTRO_SOUND_URL);
  audio.volume = INTRO_SOUND_VOLUME;
  audio.currentTime = 0;

  try {
    await audio.play();
    customSoundAvailable = true;
    return true;
  } catch {
    if (!fromUserGesture) return false;
    try {
      await audio.play();
      customSoundAvailable = true;
      return true;
    } catch {
      customSoundAvailable = false;
      return false;
    }
  }
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
}

async function playSynthIntroSound(fromUserGesture: boolean): Promise<boolean> {
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

    window.setTimeout(() => {
      void ctx.close();
    }, 1200);

    return true;
  } catch {
    return false;
  }
}

/** Plays your uploaded sound, or the built-in hit if the file is missing. */
export async function playBrandIntroSound(fromUserGesture = false): Promise<boolean> {
  if (played) return true;

  const customPlayed = await playCustomIntroSound(fromUserGesture);
  if (customPlayed) {
    played = true;
    return true;
  }

  const synthPlayed = await playSynthIntroSound(fromUserGesture);
  if (synthPlayed) {
    played = true;
    return true;
  }

  return false;
}

export function hasIntroSoundPlayed() {
  return played;
}

export function resetIntroSoundForTesting() {
  played = false;
}
