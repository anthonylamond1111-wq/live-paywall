import { NextResponse } from 'next/server';
import { getStreamUrl, MAX_STREAM_HEIGHT, MOBILE_MAX_STREAM_HEIGHT } from '@/lib/constants';
import { capPlaylistResolutions, isMobileUserAgent } from '@/lib/hls-config';
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

function isPlaylistUri(uri: string) {
  const path = uri.split('?')[0]?.toLowerCase() ?? '';
  return path.endsWith('.m3u8');
}

/**
 * Nested playlists go back through our auth proxy so preview access can be
 * revoked after 90s. Media segments stay on the CDN for performance.
 */
function rewritePlaylist(body: string, sourceUrl: string, proxyPath: string) {
  const base = sourceUrl.substring(0, sourceUrl.lastIndexOf('/') + 1);

  const viaProxy = (absolute: string) => {
    if (!isPlaylistUri(absolute)) return absolute;
    return `${proxyPath}?url=${encodeURIComponent(absolute)}`;
  };

  return body
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith('#')) {
        if (!trimmed.includes('URI="')) return line;
        return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => {
          return `URI="${viaProxy(toAbsoluteUrl(uri, base))}"`;
        });
      }

      return viaProxy(toAbsoluteUrl(trimmed, base));
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

      const userAgent = request.headers.get('user-agent');
      const playlistMaxHeight = isMobileUserAgent(userAgent)
        ? MOBILE_MAX_STREAM_HEIGHT
        : MAX_STREAM_HEIGHT;

      return new Response(
        capPlaylistResolutions(
          rewritePlaylist(text, target, '/api/hls/playlist'),
          playlistMaxHeight
        ),
        {
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
