/** Browser notifications for support chat — never broadcast; caller scopes who sees them. */

export function supportNotifyPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function ensureSupportNotifyPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function showSupportNotification(input: {
  title: string;
  body: string;
  tag: string;
  onClick?: () => void;
}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const note = new Notification(input.title, {
      body: input.body,
      tag: input.tag,
    });
    note.onclick = () => {
      window.focus();
      input.onClick?.();
      note.close();
    };
  } catch {
    // Some browsers block Notification construction outside user gestures.
  }
}
