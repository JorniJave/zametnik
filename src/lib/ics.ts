import type { CalendarEvent } from '../types/planning';

/** Функция `pad`. */
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Функция `toIcsDate`. */
function toIcsDate(date: string, time?: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (time) {
    const [h, min] = time.split(':').map(Number);
    return `${y}${pad(m)}${pad(d)}T${pad(h)}${pad(min)}00`;
  }
  return `${y}${pad(m)}${pad(d)}`;
}

/** Функция `escapeIcs`. */
function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** Функция `exportEventsToIcs`. */
export function exportEventsToIcs(events: CalendarEvent[], calendarName = 'Zametnik'): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Zametnik//RU',
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    'CALSCALE:GREGORIAN',
  ];
  for (const ev of events) {
    const start = toIcsDate(ev.date, ev.startTime);
    const end = ev.endTime ? toIcsDate(ev.date, ev.endTime) : toIcsDate(ev.date, ev.startTime);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.id}@zametnik`,
      `DTSTAMP:${toIcsDate(new Date().toISOString().slice(0, 10))}T000000`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeIcs(ev.title)}`
    );
    if (ev.location) lines.push(`LOCATION:${escapeIcs(ev.location)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeIcs(ev.description)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/** Функция `downloadIcs`. */
export function downloadIcs(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
