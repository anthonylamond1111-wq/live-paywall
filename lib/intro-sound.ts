import { INTRO_SOUND_URL, INTRO_SOUND_VOLUME } from '@/lib/constants';

let played = false;
let preloadedAudio: HTMLAudioElement | null = null;
let activeAudio: HTMLAudioElement | null = null;
let customSoundAvailable: boolean | null = null;
let fallbackAttached = false;
let warmPromise: Promise<HTMLAudioElement | null> | null = null;

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  return new Ctx();
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function waitForCanPlay(audio: HTMLAudioElement): Promise<HTMLAudioElement> {
  if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
    return Promise.resolve(audio);
  }

  return new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve(audio);
    };
    const onError = () => {
      cleanup();
      reject(new Error('Intro sound failed to load'));
    };
    const cleanup = () => {
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('error', onError);
    };

    audio.addEventListener('canplaythrough', onReady, { once: true });
    audio.addEventListener('error', onError, { once: true });
    audio.load();
  });
}

async function loadIntroAudio(): Promise<HTMLAudioElement | null> {
  if (!INTRO_SOUND_URL) return null;
  if (preloadedAudio && preloadedAudio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
    return preloadedAudio;
  }

  try {
    const response = await fetch(INTRO_SOUND_URL, { cache: 'force-cache' });
    if (!response.ok) throw new Error('Intro sound fetch failed');

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(objectUrl);
    audio.preload = 'auto';
    audio.volume = INTRO_SOUND_VOLUME;

    await waitForCanPlay(audio);

    customSoundAvailable = true;
    preloadedAudio = audio;
    return audio;
  } catch {
    customSoundAvailable = false;
    return null;
  }
}

/** Start loading intro audio as early as possible (layout mount). */
export function warmIntroSound(): Promise<HTMLAudioElement | null> {
  if (typeof window === 'undefined' || !INTRO_SOUND_URL) {
    return Promise.resolve(null);
  }

  if (preloadedAudio && preloadedAudio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
    return Promise.resolve(preloadedAudio);
  }

  if (!warmPromise) {
    warmPromise = loadIntroAudio().finally(() => {
      warmPromise = null;
    });
  }

  return warmPromise;
}

/** @deprecated Prefer warmIntroSound() on layout mount. */
export function preloadIntroSound() {
  void warmIntroSound();
}

function getReadyAudio(): HTMLAudioElement | null {
  if (
    preloadedAudio &&
    preloadedAudio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
  ) {
    return preloadedAudio;
  }
  return null;
}

function markAudioPlaying(audio: HTMLAudioElement) {
  customSoundAvailable = true;
  activeAudio = audio;
  preloadedAudio = audio;
  played = true;
  detachIntroSoundFallback();
}

/**
 * Call synchronously inside pointerdown/touchstart — required for iOS Safari.
 */
export function playBrandIntroSoundFromGesture(): boolean {
  if (activeAudio && !activeAudio.paused && !activeAudio.ended) {
    return true;
  }

  const audio = getReadyAudio();
  if (!audio) {
    void warmIntroSound().then((loaded) => {
      if (!loaded || played) return;
      loaded.currentTime = 0;
      loaded.volume = INTRO_SOUND_VOLUME;
      void loaded.play().then(() => markAudioPlaying(loaded)).catch(() => {});
    });
    return false;
  }

  audio.volume = INTRO_SOUND_VOLUME;
  if (!activeAudio || activeAudio.ended) {
    audio.currentTime = 0;
  }

  try {
    const result = audio.play();
    markAudioPlaying(audio);
    void result?.catch(() => {
      played = false;
      activeAudio = null;
    });
    return true;
  } catch {
    return false;
  }
}

async function playCustomIntroSoundAutoplay(): Promise<boolean> {
  if (!INTRO_SOUND_URL || customSoundAvailable === false) return false;
  if (activeAudio && !activeAudio.paused && !activeAudio.ended) return true;

  const audio = await warmIntroSound();
  if (!audio) return false;

  audio.volume = INTRO_SOUND_VOLUME;
  if (!activeAudio || activeAudio.ended) {
    audio.currentTime = 0;
  }

  try {
    await audio.play();
    markAudioPlaying(audio);
    return true;
  } catch {
    return false;
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

async function playSynthIntroSoundAutoplay(): Promise<boolean> {
  const ctx = createAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') await ctx.resume();
    if (ctx.state !== 'running') return false;

    scheduleHit(ctx, ctx.currentTime + 0.02);
    window.setTimeout(() => void ctx.close(), 1200);
    played = true;
    activeAudio = null;
    return true;
  } catch {
    return false;
  }
}

/** Desktop autoplay attempt — returns false if blocked (mobile). */
export async function tryAutoplayIntroSound(): Promise<boolean> {
  if (activeAudio && !activeAudio.paused && !activeAudio.ended) return true;

  if (await playCustomIntroSoundAutoplay()) return true;
  return playSynthIntroSoundAutoplay();
}

/** @deprecated Use tryAutoplayIntroSound or playBrandIntroSoundFromGesture */
export async function playBrandIntroSound(fromUserGesture = false): Promise<boolean> {
  if (fromUserGesture) return playBrandIntroSoundFromGesture();
  return tryAutoplayIntroSound();
}

function onFirstInteraction() {
  playBrandIntroSoundFromGesture();
}

function detachIntroSoundFallback() {
  if (typeof window === 'undefined' || !fallbackAttached) return;
  window.removeEventListener('pointerdown', onFirstInteraction, true);
  window.removeEventListener('touchstart', onFirstInteraction, true);
  fallbackAttached = false;
}

/** After splash hides — first tap anywhere on the page starts the intro audio. */
export function setupIntroSoundOnFirstTap() {
  if (typeof window === 'undefined' || fallbackAttached) return;
  if (activeAudio && !activeAudio.paused && !activeAudio.ended) return;

  fallbackAttached = true;
  window.addEventListener('pointerdown', onFirstInteraction, { capture: true, once: true });
  window.addEventListener('touchstart', onFirstInteraction, { capture: true, once: true });
}

export function hasIntroSoundStarted(): boolean {
  return !!(activeAudio && !activeAudio.ended && played);
}

export function resetIntroSoundForTesting() {
  played = false;
  activeAudio = null;
  warmPromise = null;
  detachIntroSoundFallback();
}
