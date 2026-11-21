import { describe, it, expect } from 'vitest';
import { isValidTimeRange, normalizeEndTime } from './time';

describe('time', () => {
  it('rejects end before start', () => {
    expect(isValidTimeRange('11:00', '09:45')).toBe(false);
    expect(isValidTimeRange('09:00', '09:45')).toBe(true);
  });

  it('normalizeEndTime adds 45 min', () => {
    expect(normalizeEndTime('11:00', '09:45')).toBe('11:45');
  });
});
