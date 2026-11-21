/** Индиго интерфейса. На холсте графа CSS-переменные не всегда доступны. */
export function accentHex(): string {
  if (typeof document === 'undefined') return '#7c9eff';
  const dark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
  return dark ? '#7c9eff' : '#5a7fd4';
}

export function inkHex(): string {
  if (typeof document === 'undefined') return '#eef0f6';
  const dark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
  return dark ? '#eef0f6' : '#1a1b26';
}

export function mutedHex(): string {
  if (typeof document === 'undefined') return '#4a5568';
  const dark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
  return dark ? '#3a3d52' : '#c5cadb';
}
