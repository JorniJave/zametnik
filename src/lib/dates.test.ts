import { describe, it, expect } from 'vitest';
import { formatDateRu, parseDateRu } from './dates';

describe('dates', () => {
  it('formatDateRu', () => {
    expect(formatDateRu('2026-08-28')).toBe('28.08.2026');
  });

  it('parseDateRu from dotted', () => {
    expect(parseDateRu('28.08.2026')).toBe('2026-08-28');
    expect(parseDateRu('8.8.2026')).toBe('2026-08-08');
  });
});
