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

export async function canProxyStream(request: Request, targetUrl: string): Promise<boolean> {
  const mainStream = getStreamUrl();
  if (!mainStream || targetUrl !== mainStream) {
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
