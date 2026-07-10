import { ImageResponse } from 'next/og';
import { EVENT } from '@/lib/event';

export const runtime = 'edge';
export const alt = 'UFC Access — Live Stream';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #000 0%, #1a0505 50%, #000 100%)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 8, color: '#ef4444', marginBottom: 24 }}>
          {EVENT.number} • LIVE
        </div>
        <div style={{ fontSize: 72, fontWeight: 900, textAlign: 'center', lineHeight: 1.1 }}>
          {EVENT.fighter1}
        </div>
        <div style={{ fontSize: 32, color: '#6b7280', margin: '12px 0' }}>VS</div>
        <div style={{ fontSize: 72, fontWeight: 900, textAlign: 'center', lineHeight: 1.1 }}>
          {EVENT.fighter2}
        </div>
        <div style={{ fontSize: 24, color: '#9ca3af', marginTop: 32 }}>{EVENT.tagline}</div>
        <div style={{ fontSize: 20, color: '#dc2626', marginTop: 48, fontWeight: 700 }}>
          UFC ACCESS
        </div>
      </div>
    ),
    { ...size }
  );
}
