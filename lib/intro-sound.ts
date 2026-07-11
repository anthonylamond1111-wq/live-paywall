import { INTRO_SOUND_URL, INTRO_SOUND_VOLUME } from '@/lib/constants';

let played = false;
let preloadedAudio: HTMLAudioElement | null = null;
let activeAudio: HTMLAudioElement | null = null;
let customSoundAvailable: boolean | null = null;
let fallbackAttached = false;

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

function getOrCreateAudio(): HTMLAudioElement | null {
  if (!INTRO_SOUND_URL) return null;
  if (!preloadedAudio) {
    preloadedAudio = new Audio(INTRO_SOUND_URL);
    preloadedAudio.preload = 'auto';
    preloadedAudio.load();
  }
  return preloadedAudio;
}

/** Call on intro mount so your file is ready when the user taps. */
export function preloadIntroSound() {
  if (typeof window === 'undefined' || !INTRO_SOUND_URL) return;
  const audio = getOrCreateAudio();
  if (!audio) return;

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

  const audio = getOrCreateAudio();
  if (!audio) return false;

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

  const audio = getOrCreateAudio();
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
  detachIntroSoundFallback();
}
