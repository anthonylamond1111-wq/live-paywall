import { NextResponse } from 'next/server';
import { getStreamUrl } from '@/lib/constants';
import { canProxyStream } from '@/lib/hls-access';

export const dynamic = 'force-dynamic';

const ALLOWED_HOSTS = [
  'cloudflarestream.com',
  'videodelivery.net',
  'livepeercdn.studio',
  'playback.livepeer.studio',
];

function isAllowedUrl(url: string) {
  try {
    const parsed = new URL(url);
    return ALLOWED_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function toAbsoluteUrl(uri: string, base: string) {
  return uri.startsWith('http') ? uri : new URL(uri, base).toString();
}

/** Point playlists at Cloudflare/Livepeer directly — only the entry manifest hits Railway for auth. */
function rewritePlaylist(body: string, sourceUrl: string) {
  const base = sourceUrl.substring(0, sourceUrl.lastIndexOf('/') + 1);

  return body
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith('#')) {
        if (!trimmed.includes('URI="')) return line;
        return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => {
          return `URI="${toAbsoluteUrl(uri, base)}"`;
        });
      }

      return toAbsoluteUrl(trimmed, base);
    })
    .join('\n');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url') ?? getStreamUrl();

  if (!target) {
    return NextResponse.json(
      { error: 'Stream not configured. Set STREAM_URL on Railway.' },
      { status: 500 }
    );
  }

  if (!isAllowedUrl(target)) {
    return NextResponse.json({ error: 'Invalid stream URL' }, { status: 400 });
  }

  const allowed = await canProxyStream(request, target);
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

      return new Response(rewritePlaylist(text, target), {
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
