import { describe, it, expect } from 'vitest';
import { getWeekStart, getWeekLabel, titleToId, formatDate } from './parser';
import { materializeScheduleForDate } from './planning';
import type { ScheduleTemplate } from '../types/planning';

describe('parser', () => {
  it('titleToId normalizes titles', () => {
    expect(titleToId('Проект/Альфа')).toBe('проект-альфа');
  });

  it('getWeekStart respects Monday', () => {
    const wed = new Date(2026, 7, 26);
    const start = getWeekStart(wed, 1);
    expect(formatDate(start)).toBe('2026-08-24');
  });

  it('getWeekLabel includes week number', () => {
    expect(getWeekLabel(new Date(2026, 7, 26), 1)).toMatch(/^Неделя \d+ - 2026$/);
  });
});

describe('planning', () => {
  it('materializes schedule slots for weekday', () => {
    const schedule: ScheduleTemplate = {
      id: 's1',
      title: 'Test',
      slots: [
        {
          id: 'a',
          weekdays: [1],
          startTime: '09:00',
          endTime: '10:00',
          title: 'Math',
        },
      ],
      exceptions: [],
    };
    const events = materializeScheduleForDate(schedule, '2026-08-24');
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Math');
  });
});
