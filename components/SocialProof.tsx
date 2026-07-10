'use client';

import { useEffect, useState } from 'react';

const TICKER_NAMES = [
  'James from London',
  'Sarah from Manchester',
  'Mike from Birmingham',
  'Emma from Glasgow',
  'Dan from Liverpool',
  'Lisa from Bristol',
  'Tom from Leeds',
  'Amy from Cardiff',
];

export default function SocialProof() {
  const [count, setCount] = useState<number | null>(null);
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    void fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => setCount(d.displayCount ?? 12))
      .catch(() => setCount(12));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTickerIndex((i) => (i + 1) % TICKER_NAMES.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="space-y-3 text-center">
      {count !== null && (
        <p className="text-sm text-gray-400">
          <span className="font-semibold text-white">{count}+</span> fans unlocked access
        </p>
      )}
      <p className="text-xs text-gray-600 transition-opacity duration-500">
        <span className="text-green-500">●</span> {TICKER_NAMES[tickerIndex]} just joined
      </p>
    </div>
  );
}
