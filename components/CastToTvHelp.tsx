'use client';

import { useState } from 'react';

export default function CastToTvHelp() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-gray-300 transition hover:border-red-500 sm:text-sm"
      >
        Watch on TV
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold">Watch on your TV</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-gray-400">
              <div>
                <p className="font-semibold text-white">iPhone / iPad (AirPlay)</p>
                <p className="mt-1">
                  Open the stream, tap the AirPlay icon in the video controls, and select your Apple
                  TV or AirPlay-compatible TV.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">Android (Chromecast)</p>
                <p className="mt-1">
                  Open in Chrome, tap the three-dot menu → Cast, and select your Chromecast or smart
                  TV.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">Laptop → TV (HDMI)</p>
                <p className="mt-1">
                  Connect your laptop to the TV with an HDMI cable, open UFC Access in fullscreen,
                  and play the stream.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">Smart TV browser</p>
                <p className="mt-1">
                  Open the built-in browser on your TV and go to ufcaccess.co.uk, then log in and
                  watch.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-xl bg-white py-3 text-sm font-semibold text-black"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
