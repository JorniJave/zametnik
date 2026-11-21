/** Сравнение HH:mm (лексикографически корректно для 00:00–23:59). */
export function isValidTimeRange(start: string, end: string): boolean {
  if (!start || !end) return true;
  return start < end;
}

/** Если конец раньше начала — +45 мин к началу. */
export function normalizeEndTime(start: string, end: string): string {
  if (!start || !end || isValidTimeRange(start, end)) return end;
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + 45;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

/** Функция `addMinutesToTime`. */
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}
