import { describe, it, expect } from 'vitest';
import { exportEventsToIcs } from './ics';

describe('ics', () => {
  it('exports calendar events', () => {
    const ics = exportEventsToIcs([
      {
        id: 'e1',
        title: 'Встреча',
        date: '2026-08-28',
        startTime: '10:00',
        endTime: '11:00',
      },
    ]);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:Встреча');
  });
});
