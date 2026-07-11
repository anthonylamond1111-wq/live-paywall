import { INTRO_SOUND_URL, INTRO_SOUND_VOLUME } from '@/lib/constants';

let played = false;
let preloadedAudio: HTMLAudioElement | null = null;
let activeAudio: HTMLAudioElement | null = null;
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

function waitForAudioEnd(audio: HTMLAudioElement): Promise<void> {
  return new Promise((resolve) => {
    if (audio.ended) {
      resolve();
      return;
    }
    const done = () => resolve();
    audio.addEventListener('ended', done, { once: true });
    audio.addEventListener('error', done, { once: true });
  });
}

async function playCustomIntroSound(fromUserGesture: boolean): Promise<HTMLAudioElement | null> {
  if (!INTRO_SOUND_URL) return null;
  if (customSoundAvailable === false) return null;

  if (activeAudio && !activeAudio.paused && !activeAudio.ended) {
    return activeAudio;
  }

  const audio = preloadedAudio ?? new Audio(INTRO_SOUND_URL);
  audio.volume = INTRO_SOUND_VOLUME;

  if (!activeAudio || activeAudio.ended) {
    audio.currentTime = 0;
  }

  try {
    await audio.play();
    customSoundAvailable = true;
    activeAudio = audio;
    preloadedAudio = audio;
    return audio;
  } catch {
    if (!fromUserGesture) return null;
    try {
      await audio.play();
      customSoundAvailable = true;
      activeAudio = audio;
      preloadedAudio = audio;
      return audio;
    } catch {
      customSoundAvailable = false;
      return null;
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

/** Start intro audio. Returns false if autoplay blocked (user must tap). */
export async function playBrandIntroSound(fromUserGesture = false): Promise<boolean> {
  if (played && activeAudio && !activeAudio.paused && !activeAudio.ended) {
    return true;
  }

  const customAudio = await playCustomIntroSound(fromUserGesture);
  if (customAudio) {
    played = true;
    return true;
  }

  const synthPlayed = await playSynthIntroSound(fromUserGesture);
  if (synthPlayed) {
    played = true;
    activeAudio = null;
    return true;
  }

  return false;
}

/** Resolves when the current intro sound has fully finished. */
export async function waitForIntroSoundEnd(): Promise<void> {
  if (activeAudio) {
    await waitForAudioEnd(activeAudio);
    return;
  }

  if (played) {
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
  }
}

export function hasIntroSoundPlayed() {
  return played;
}

export function resetIntroSoundForTesting() {
  played = false;
  activeAudio = null;
}
