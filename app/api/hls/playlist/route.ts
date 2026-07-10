import { NextResponse } from 'next/server';
import { STREAM_URL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const ALLOWED_HOSTS = ['livepeercdn.studio', 'playback.livepeer.studio'];

function isAllowedUrl(url: string) {
  try {
    const parsed = new URL(url);
    return ALLOWED_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function rewritePlaylist(body: string, sourceUrl: string, origin: string) {
  const base = sourceUrl.substring(0, sourceUrl.lastIndexOf('/') + 1);

  return body
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;

      const absolute = trimmed.startsWith('http') ? trimmed : new URL(trimmed, base).toString();
      return `${origin}/api/hls/playlist?url=${encodeURIComponent(absolute)}`;
    })
    .join('\n');
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const target = searchParams.get('url') ?? STREAM_URL;

  if (!isAllowedUrl(target)) {
    return NextResponse.json({ error: 'Invalid stream URL' }, { status: 400 });
  }

  try {
    const upstream = await fetch(target, { cache: 'no-store' });

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Stream unavailable' }, { status: upstream.status });
    }

    const contentType = upstream.headers.get('content-type') ?? '';

    if (target.includes('.m3u8') || contentType.includes('mpegurl')) {
      const text = await upstream.text();

      if (text.includes('#EXT-X-ERROR')) {
        return new Response(text, {
          status: 503,
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Cache-Control': 'no-store',
          },
        });
      }

      return new Response(rewritePlaylist(text, target, origin), {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-store',
        },
      });
    }

    const buffer = await upstream.arrayBuffer();
    return new Response(buffer, {
      headers: {
        'Content-Type': contentType || 'video/mp2t',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('HLS proxy error:', error);
    return NextResponse.json({ error: 'Stream proxy failed' }, { status: 502 });
  }
}
