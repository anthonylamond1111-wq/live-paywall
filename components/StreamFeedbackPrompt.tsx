'use client';

import { useEffect, useState } from 'react';

const PROMPT_KEY = 'ufc_stream_feedback_prompt_v1';
const DISPLAY_MS = 3000;

type StreamFeedbackPromptProps = {
  streamLive: boolean;
};

export default function StreamFeedbackPrompt({ streamLive }: StreamFeedbackPromptProps) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!streamLive) return;
    if (sessionStorage.getItem(PROMPT_KEY) === '1') return;

    sessionStorage.setItem(PROMPT_KEY, '1');
    setVisible(true);

    const fadeTimer = window.setTimeout(() => setFading(true), DISPLAY_MS - 350);
    const hideTimer = window.setTimeout(() => setVisible(false), DISPLAY_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [streamLive]);

  if (!visible) return null;

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-[4.5rem] z-[90] flex justify-center px-4 transition-opacity duration-300 sm:top-24 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="max-w-sm rounded-xl border border-red-500/50 bg-black/90 px-4 py-3 text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <p className="text-sm font-semibold text-white">How&apos;s the stream?</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-300">
          Drop us a message in live chat — buffering, quality, all good?
        </p>
      </div>
    </div>
  );
}
