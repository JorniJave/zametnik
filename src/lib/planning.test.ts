import { describe, expect, it } from 'vitest';
import { tasksForToday } from './planning';
import type { StructuredTask } from '../types/planning';

function task(partial: Partial<StructuredTask> & { title: string }): StructuredTask {
  return {
    id: partial.title,
    done: false,
    status: 'scheduled',
    priority: 'normal',
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

describe('tasksForToday', () => {
  it('includes a high-priority task dated today', () => {
    const list = tasksForToday(
      [
        task({ title: 'важная', dueDate: '2026-10-01', priority: 'high', status: 'today' }),
        task({ title: 'завтра', dueDate: '2026-10-02', status: 'scheduled' }),
      ],
      '2026-10-01'
    );
    expect(list.map((item) => item.title)).toEqual(['важная']);
  });

  it('accepts a Russian date and keeps high priority first', () => {
    const list = tasksForToday(
      [
        task({ title: 'обычная', dueDate: '2026-10-01', priority: 'normal', status: 'today' }),
        task({ title: 'важная', dueDate: '01.10.2026', priority: 'high', status: 'scheduled' }),
      ],
      '2026-10-01'
    );
    expect(list.map((item) => item.title)).toEqual(['важная', 'обычная']);
  });
});
