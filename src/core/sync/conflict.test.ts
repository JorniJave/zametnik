import { describe, it, expect } from 'vitest';
import { resolveConflict } from './conflict';

describe('resolveConflict', () => {
  it('picks newer timestamp', () => {
    const local = { updatedAt: 200, deviceId: 'a', value: 1 };
    const remote = { updatedAt: 100, deviceId: 'b', value: 2 };
    expect(resolveConflict(local, remote).winner).toBe('local');
  });

  it('uses deviceId tie-breaker', () => {
    const local = { updatedAt: 100, deviceId: 'a', value: 1 };
    const remote = { updatedAt: 100, deviceId: 'b', value: 2 };
    expect(resolveConflict(local, remote).winner).toBe('local');
  });
});
