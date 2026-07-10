'use client';

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'ufc_a2hs_dismissed';

function isStandalone() {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isMobile() {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export default function AddToHomeScreen() {
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    if (isStandalone() || !isMobile()) return;

    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIos(ios);
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] border-t border-red-600/40 bg-zinc-900/95 p-4 backdrop-blur-md sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm sm:rounded-2xl sm:border">
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, '1');
          setShow(false);
        }}
        className="absolute right-3 top-3 text-gray-500 hover:text-white"
        aria-label="Dismiss"
      >
        ✕
      </button>
      <p className="pr-6 text-sm font-semibold text-white">Add to Home Screen</p>
      <p className="mt-1 text-xs text-gray-400">
        {isIos
          ? 'Tap Share → Add to Home Screen for the best fullscreen experience on fight night.'
          : 'Install this app for quick access and a fullscreen viewing experience.'}
      </p>
    </div>
  );
}
