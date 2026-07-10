import { EVENT } from '@/lib/event';

function formatIcsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function downloadEventCalendar() {
  const start = formatIcsDate(EVENT.streamStart);
  const end = formatIcsDate(
    new Date(new Date(EVENT.streamStart).getTime() + 5 * 60 * 60 * 1000).toISOString()
  );

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UFC Access//EN',
    'BEGIN:VEVENT',
    `UID:ufc-access-${EVENT.number.replace(/\s/g, '-')}@ufcaccess.co.uk`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${EVENT.number} — ${EVENT.fighter1} vs ${EVENT.fighter2}`,
    `DESCRIPTION:UFC Access live stream. ${EVENT.siteUrl}`,
    `LOCATION:${EVENT.venue}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ufc-access-event.ics';
  link.click();
  URL.revokeObjectURL(url);
}

export function getGoogleCalendarUrl() {
  const start = new Date(EVENT.streamStart);
  const end = new Date(start.getTime() + 5 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${EVENT.number} — ${EVENT.fighter1} vs ${EVENT.fighter2}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `Watch live on UFC Access: ${EVENT.siteUrl}`,
    location: EVENT.venue,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
