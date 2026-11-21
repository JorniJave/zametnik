import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { importPlanningFromWorkbook, applyExcelImport, parseCellDate } from './excel';
import { EMPTY_PLANNING } from '../types/planning';

function makeWorkbook(sheets: Record<string, (string | number)[][]>): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  }
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

describe('parseCellDate', () => {
  it('parses ISO date', () => {
    expect(parseCellDate('2026-08-28')).toBe('2026-08-28');
  });
  it('parses dd.mm.yyyy', () => {
    expect(parseCellDate('28.08.2026')).toBe('2026-08-28');
  });
});

describe('importPlanningFromWorkbook', () => {
  it('imports tasks sheet', () => {
    const buf = makeWorkbook({
      Задачи: [
        ['Задача', 'Статус', 'Срок', 'Время до', 'Приоритет', 'Проект'],
        ['Сдать работу', '', '2026-09-01', '15:00', 'высокий', 'Учёба'],
      ],
    });
    const result = importPlanningFromWorkbook(buf);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe('Сдать работу');
    expect(result.tasks[0].dueDate).toBe('2026-09-01');
    expect(result.tasks[0].dueTime).toBe('15:00');
    expect(result.tasks[0].priority).toBe('high');
  });

  it('imports schedule sheet as events', () => {
    const buf = makeWorkbook({
      События: [
        ['Дата', 'Начало', 'Конец', 'Событие', 'Описание'],
        ['2026-08-28', '10:00', '10:45', 'Физика', 'Каб. 112'],
      ],
    });
    const result = importPlanningFromWorkbook(buf);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toBe('Физика');
    expect(result.events[0].startTime).toBe('10:00');
  });

  it('imports weekly template table', () => {
    const buf = makeWorkbook({
      Таблица: [
        ['День', 'Начало', 'Конец', 'Название', 'Описание', 'Шаблон'],
        ['Пн', '09:00', '09:45', 'Математика', '', 'Школа'],
        ['Вт', '10:00', '10:45', 'Физика', 'Каб. 12', 'Школа'],
      ],
    });
    const result = importPlanningFromWorkbook(buf);
    expect(result.schedules).toHaveLength(1);
    expect(result.schedules[0].title).toBe('Школа');
    expect(result.schedules[0].slots).toHaveLength(2);
  });

  it('merges into planning', () => {
    const buf = makeWorkbook({
      Задачи: [['Задача', 'Срок'], ['Новая', '2026-08-30']],
    });
    const imported = importPlanningFromWorkbook(buf);
    const merged = applyExcelImport({ ...EMPTY_PLANNING, tasks: [{ id: 'old', title: 'Old', done: false, status: 'inbox', priority: 'normal', tags: [], createdAt: 0, updatedAt: 0 }] }, imported, {
      mergeTasks: true,
      mergeEvents: true,
      mergeSchedules: true,
    });
    expect(merged.tasks).toHaveLength(2);
  });
});
