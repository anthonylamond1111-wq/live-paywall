import { getStreamUrl } from '@/lib/constants';
import { hasPaidAccess } from '@/lib/access-cookie';
import { canAccessPreviewStream } from '@/lib/preview-access';
import {
  getTokenFromRequest,
  getUserFromRequest,
  resolveUserAccess,
} from '@/lib/supabase/server';

export function getHlsPlaylistPath(): string {
  return '/api/hls/playlist';
}

/** Allow main manifest plus Cloudflare/Livepeer variant playlists and segments from the same stream. */
export function isAllowedStreamTarget(targetUrl: string, mainStream: string): boolean {
  if (targetUrl === mainStream) return true;

  try {
    const target = new URL(targetUrl);
    const main = new URL(mainStream);
    if (target.protocol !== main.protocol) return false;

    const isCloudflareStream =
      main.hostname.endsWith('.cloudflarestream.com') ||
      main.hostname === 'cloudflarestream.com' ||
      main.hostname.endsWith('.videodelivery.net') ||
      main.hostname === 'videodelivery.net';

    // Cloudflare encodes tracks under different path IDs — same customer host is enough.
    if (isCloudflareStream) {
      return target.hostname === main.hostname;
    }

    const livepeerMatch = main.pathname.match(/^\/hls\/([^/]+)/);
    if (livepeerMatch) {
      const playbackId = livepeerMatch[1];
      return target.pathname.startsWith(`/hls/${playbackId}/`);
    }

    const targetParts = target.pathname.split('/').filter(Boolean);
    const mainParts = main.pathname.split('/').filter(Boolean);
    if (targetParts.length < 2 || mainParts.length < 2) return false;

    return targetParts[0] === mainParts[0] && targetParts[1] === mainParts[1];
  } catch {
    return false;
  }
}

export async function canProxyStream(request: Request, targetUrl: string): Promise<boolean> {
  const mainStream = getStreamUrl();
  if (!mainStream || !isAllowedStreamTarget(targetUrl, mainStream)) {
    return false;
  }

  const cookieHeader = request.headers.get('cookie');
  if (canAccessPreviewStream(cookieHeader)) {
    return true;
  }

  if (await hasPaidAccess()) {
    return true;
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return false;
  }

  const token = getTokenFromRequest(request);
  return resolveUserAccess(user, token);
}
