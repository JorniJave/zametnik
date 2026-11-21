import * as XLSX from 'xlsx';
import type { CalendarEvent, PlanningData, ScheduleTemplate, StructuredTask } from '../types/planning';
import { createId, computeTaskStatus, getEventsForDate } from './planning';
import { formatDate } from './parser';
import { formatDateRu } from './dates';
import { getAPI } from './api';
import {
  SCHEDULE_TABLE_HEADERS,
  buildScheduleTableSheet,
  buildScheduleWeekSheet,
  collectScheduleTableRows,
  groupTableRowsBySource,
  parseWeekdayLabel,
  tableRowsToSchedule,
  writeStyledWorkbook,
  type ScheduleTableRow,
} from './excelSchedule';
import { styleTableSheet } from './excelStyle';

export interface ExcelImportResult {
  tasks: StructuredTask[];
  events: CalendarEvent[];
  schedules: ScheduleTemplate[];
  errors: string[];
  stats: { tasks: number; events: number; schedules: number; skipped: number };
}

export interface ExcelImportOptions {
  mergeTasks: boolean;
  mergeEvents: boolean;
  mergeSchedules: boolean;
}

const TASK_HEADERS: Record<string, keyof StructuredTask | 'done'> = {
  задача: 'title',
  task: 'title',
  title: 'title',
  название: 'title',
  статус: 'done',
  status: 'done',
  срок: 'dueDate',
  дата: 'dueDate',
  date: 'dueDate',
  'время до': 'dueTime',
  время: 'dueTime',
  time: 'dueTime',
  приоритет: 'priority',
  priority: 'priority',
  проект: 'project',
  project: 'project',
};

const EVENT_HEADERS: Record<string, string> = {
  дата: 'date',
  date: 'date',
  начало: 'startTime',
  start: 'startTime',
  конец: 'endTime',
  end: 'endTime',
  событие: 'title',
  event: 'title',
  название: 'title',
  title: 'title',
  описание: 'description',
  description: 'description',
  место: 'description',
  источник: 'source',
};

const TEMPLATE_HEADERS: Record<string, keyof ScheduleTableRow | 'weekdayLabel'> = {
  день: 'weekdayLabel',
  'день недели': 'weekdayLabel',
  weekday: 'weekdayLabel',
  day: 'weekdayLabel',
  начало: 'startTime',
  start: 'startTime',
  конец: 'endTime',
  end: 'endTime',
  название: 'title',
  title: 'title',
  занятие: 'title',
  описание: 'description',
  description: 'description',
  шаблон: 'source',
  расписание: 'source',
  source: 'source',
};

/** Функция `normalizeHeader`. */
function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Функция `base64ToArrayBuffer`. */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Функция `arrayBufferFromBase64`. */
export function arrayBufferFromBase64(base64: string): ArrayBuffer {
  return base64ToArrayBuffer(base64);
}

/** Функция `parseCellDate`. */
export function parseCellDate(val: string | number | undefined): string | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (!parsed) return null;
    return formatDate(new Date(parsed.y, parsed.m - 1, parsed.d));
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmY = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmY) {
    return `${dmY[3]}-${dmY[2].padStart(2, '0')}-${dmY[1].padStart(2, '0')}`;
  }
  return null;
}

/** Функция `parseCellTime`. */
export function parseCellTime(val: string | number | undefined): string | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed) return `${String(parsed.H).padStart(2, '0')}:${String(parsed.M).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }
  return s || undefined;
}

/** Функция `mapRow`. */
function mapRow(headers: string[], row: (string | number)[]): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  headers.forEach((h, i) => {
    if (h) out[normalizeHeader(h)] = row[i] ?? '';
  });
  return out;
}

/** Функция `findSheet`. */
function findSheet(wb: XLSX.WorkBook, names: string[]): XLSX.WorkSheet | null {
  for (const name of wb.SheetNames) {
    const lower = name.toLowerCase();
    if (names.some((n) => lower.includes(n))) {
      return wb.Sheets[name];
    }
  }
  return null;
}

/** Функция `sheetToRows`. */
function sheetToRows(sheet: XLSX.WorkSheet): (string | number)[][] {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as (string | number)[][];
}

/** Функция `isTemplateSheet`. */
function isTemplateSheet(headers: string[]): boolean {
  const normalized = headers.map((h) => normalizeHeader(String(h)));
  const hasDay = normalized.some((h) => h === 'день' || h === 'день недели' || h === 'weekday' || h === 'day');
  const hasDate = normalized.some((h) => h === 'дата' || h === 'date');
  const hasStart = normalized.some((h) => h === 'начало' || h === 'start');
  return hasDay && hasStart && !hasDate;
}

/** Функция `parseTasksSheet`. */
function parseTasksSheet(rows: (string | number)[][], errors: string[]): StructuredTask[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => String(h));
  const tasks: StructuredTask[] = [];
  const today = formatDate(new Date());

  for (let i = 1; i < rows.length; i++) {
    const mapped = mapRow(headers, rows[i]);
    let title = '';
    let dueDate: string | undefined;
    let dueTime: string | undefined;
    let project: string | undefined;
    let priority: StructuredTask['priority'] = 'normal';
    let done = false;

    for (const [key, val] of Object.entries(mapped)) {
      const field = TASK_HEADERS[key];
      if (!field) continue;
      const str = String(val).trim();
      if (field === 'title') title = str;
      if (field === 'dueDate') dueDate = parseCellDate(val) ?? undefined;
      if (field === 'dueTime') dueTime = parseCellTime(val);
      if (field === 'project') project = str || undefined;
      if (field === 'priority') {
        const p = str.toLowerCase();
        if (p === 'high' || p === 'высокий') priority = 'high';
        else if (p === 'low' || p === 'низкий') priority = 'low';
      }
      if (field === 'done') {
        done = ['готово', 'done', 'x', '1', 'да', 'yes', 'true'].includes(str.toLowerCase());
      }
    }

    if (!title) {
      errors.push(`Задачи, строка ${i + 1}: пустое название`);
      continue;
    }

    const now = Date.now();
    tasks.push({
      id: createId(),
      title,
      done,
      status: done ? 'done' : computeTaskStatus({ done: false, dueDate }, today),
      dueDate,
      dueTime,
      priority,
      project,
      tags: [],
      createdAt: now,
      updatedAt: now,
    });
  }
  return tasks;
}

/** Функция `parseEventsSheet`. */
function parseEventsSheet(rows: (string | number)[][], errors: string[]): CalendarEvent[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => String(h));
  const events: CalendarEvent[] = [];

  for (let i = 1; i < rows.length; i++) {
    const mapped = mapRow(headers, rows[i]);
    const cols: Record<string, string | number> = {};
    for (const [key, val] of Object.entries(mapped)) {
      const field = EVENT_HEADERS[key];
      if (field) cols[field] = val;
    }

    const date = parseCellDate(cols.date);
    const title = String(cols.title ?? '').trim();
    const startTime = parseCellTime(cols.startTime) ?? '09:00';
    const endTime = parseCellTime(cols.endTime);
    const description = String(cols.description ?? '').trim() || undefined;

    if (!date || !title) {
      if (title || cols.date) errors.push(`События, строка ${i + 1}: нужны дата и название`);
      continue;
    }

    events.push({
      id: createId(),
      title,
      date,
      startTime,
      endTime,
      description,
    });
  }
  return events;
}

/** Функция `parseTemplateSheet`. */
function parseTemplateSheet(rows: (string | number)[][], errors: string[]): ScheduleTemplate[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => String(h));
  const tableRows: ScheduleTableRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every((c) => String(c).trim() === '')) continue;

    const mapped = mapRow(headers, row);
    const parsed: Partial<ScheduleTableRow> & { weekdayLabel?: string } = {};

    for (const [key, val] of Object.entries(mapped)) {
      const field = TEMPLATE_HEADERS[key];
      if (!field) continue;
      const str = String(val).trim();
      if (field === 'weekdayLabel') parsed.weekdayLabel = str;
      if (field === 'startTime') parsed.startTime = parseCellTime(val) ?? str;
      if (field === 'endTime') parsed.endTime = parseCellTime(val) ?? str;
      if (field === 'title') parsed.title = str;
      if (field === 'description') parsed.description = str;
      if (field === 'source') parsed.source = str || undefined;
    }

    const weekday = parsed.weekdayLabel ? parseWeekdayLabel(parsed.weekdayLabel) : null;
    if (weekday === null) {
      errors.push(`Шаблон, строка ${i + 1}: непонятный день «${parsed.weekdayLabel ?? ''}»`);
      continue;
    }
    if (!parsed.title) {
      errors.push(`Шаблон, строка ${i + 1}: пустое название`);
      continue;
    }

    tableRows.push({
      weekday,
      startTime: parsed.startTime ?? '09:00',
      endTime: parsed.endTime ?? '09:45',
      title: parsed.title,
      description: parsed.description ?? '',
      source: parsed.source,
    });
  }

  if (tableRows.length === 0) return [];

  const bySource = groupTableRowsBySource(tableRows);
  const schedules: ScheduleTemplate[] = [];
  for (const [title, sourceRows] of bySource) {
    schedules.push(tableRowsToSchedule(sourceRows, title));
  }
  return schedules;
}

/** Функция `importPlanningFromWorkbook`. */
export function importPlanningFromWorkbook(buffer: ArrayBuffer): ExcelImportResult {
  const errors: string[] = [];
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

  const taskSheet = findSheet(wb, ['задач', 'task']);
  const templateSheet =
    findSheet(wb, ['таблица', 'данные', 'шаблон']) ??
    (() => {
      for (const name of wb.SheetNames) {
        const rows = sheetToRows(wb.Sheets[name]);
        if (rows[0] && isTemplateSheet(rows[0].map(String))) return wb.Sheets[name];
      }
      return null;
    })();

  let eventSheet = findSheet(wb, ['событ', 'календар']);
  if (!eventSheet) {
    const scheduleNamed = findSheet(wb, ['расписан', 'schedule']);
    if (scheduleNamed) {
      const rows = sheetToRows(scheduleNamed);
      if (rows[0] && !isTemplateSheet(rows[0].map(String))) {
        eventSheet = scheduleNamed;
      }
    }
  }

  const tasks = taskSheet ? parseTasksSheet(sheetToRows(taskSheet), errors) : [];
  const events = eventSheet ? parseEventsSheet(sheetToRows(eventSheet), errors) : [];
  const schedules = templateSheet ? parseTemplateSheet(sheetToRows(templateSheet), errors) : [];

  if (!taskSheet && !eventSheet && !templateSheet && wb.SheetNames[0]) {
    const rows = sheetToRows(wb.Sheets[wb.SheetNames[0]]);
    const headers = rows[0]?.map(String) ?? [];
    if (isTemplateSheet(headers)) {
      schedules.push(...parseTemplateSheet(rows, errors));
    } else {
      const firstHeader = normalizeHeader(String(headers[0] ?? ''));
      if (firstHeader.includes('задач') || firstHeader === 'task') {
        tasks.push(...parseTasksSheet(rows, errors));
      } else {
        events.push(...parseEventsSheet(rows, errors));
      }
    }
  }

  return {
    tasks,
    events,
    schedules,
    errors,
    stats: {
      tasks: tasks.length,
      events: events.length,
      schedules: schedules.length,
      skipped: errors.length,
    },
  };
}

/** Функция `applyExcelImport`. */
export function applyExcelImport(
  planning: PlanningData,
  imported: ExcelImportResult,
  options: ExcelImportOptions
): PlanningData {
  const tasks = options.mergeTasks
    ? [...planning.tasks.filter((t) => !t.noteId), ...imported.tasks]
    : [...planning.tasks.filter((t) => t.noteId), ...imported.tasks];

  const events = options.mergeEvents ? [...planning.events, ...imported.events] : imported.events;

  const schedules = options.mergeSchedules
    ? [...planning.schedules, ...imported.schedules]
    : imported.schedules.length > 0
      ? imported.schedules
      : planning.schedules;

  return { ...planning, tasks, events, schedules };
}

/** Функция `exportPlanningWorkbook`. */
export function exportPlanningWorkbook(planning: PlanningData, from: Date, days = 7): ArrayBuffer {
  const scheduleRows: (string | number)[][] = [
    ['Дата', 'Начало', 'Конец', 'Событие', 'Описание', 'Источник'],
  ];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const ds = formatDate(d);
    for (const ev of getEventsForDate(planning, ds)) {
      scheduleRows.push([
        formatDateRu(ds),
        ev.startTime,
        ev.endTime ?? '',
        ev.title,
        ev.description ?? ev.location ?? '',
        ev.scheduleId ? 'расписание' : 'событие',
      ]);
    }
  }

  const taskRows: (string | number)[][] = [
    ['Задача', 'Статус', 'Срок', 'Время до', 'Приоритет', 'Проект'],
  ];
  for (const t of planning.tasks.filter((t) => !t.noteId)) {
    taskRows.push([
      t.title,
      t.done ? 'готово' : t.status,
      t.dueDate ? formatDateRu(t.dueDate) : '',
      t.dueTime ?? '',
      t.priority,
      t.project ?? '',
    ]);
  }

  const scheduleSheet = styleTableSheet(XLSX.utils.aoa_to_sheet(scheduleRows), scheduleRows[0].length);
  const taskSheet = styleTableSheet(XLSX.utils.aoa_to_sheet(taskRows), taskRows[0].length);

  const legend = [
    ['Zametnik — экспорт'],
    [''],
    ['Лист «События»', 'Задачи и события по конкретным датам (календарь)'],
    ['Лист «Задачи»', 'Список задач'],
    ['Импорт', 'Не меняйте названия колонок в первой строке'],
    ['Даты', 'ДД.ММ.ГГГГ или ГГГГ-ММ-ДД'],
  ];

  return writeStyledWorkbook([
    { name: 'События', sheet: scheduleSheet },
    { name: 'Задачи', sheet: taskSheet },
    { name: 'Справка', sheet: XLSX.utils.aoa_to_sheet(legend) },
  ]);
}

/** Функция `buildScheduleWorkbook`. */
function buildScheduleWorkbook(
  schedules: { schedule: ScheduleTemplate; sourceLabel?: string }[],
  weekStartsOn: 0 | 1,
  displayTitle?: string
): ArrayBuffer {
  const rows = collectScheduleTableRows(schedules, weekStartsOn);
  const tableSheet = buildScheduleTableSheet(rows);
  const weekSheet = buildScheduleWeekSheet(rows, weekStartsOn);

  const legend = [
    ['Zametnik — шаблон расписания'],
    ...(displayTitle ? [['', displayTitle] as string[]] : []),
    [''],
    ['Лист «Таблица»', 'Редактируйте здесь: одна строка = один пункт'],
    ['Колонки', SCHEDULE_TABLE_HEADERS.join(' · ')],
    ['Лист «Неделя»', 'Только для просмотра — как в приложении'],
    ['Импорт', 'Настройки → Импорт из Excel (лист «Таблица»)'],
    ['День', 'Пн, Вт, Ср… или полное название'],
  ];

  return writeStyledWorkbook([
    { name: 'Таблица', sheet: tableSheet },
    { name: 'Неделя', sheet: weekSheet },
    { name: 'Справка', sheet: XLSX.utils.aoa_to_sheet(legend) },
  ]);
}

/** Функция `exportScheduleTemplate`. */
export function exportScheduleTemplate(
  schedule: ScheduleTemplate,
  weekStartsOn: 0 | 1 = 1
): ArrayBuffer {
  return buildScheduleWorkbook([{ schedule }], weekStartsOn, schedule.title);
}

/** Функция `exportMergedSchedules`. */
export function exportMergedSchedules(
  schedules: ScheduleTemplate[],
  title: string,
  weekStartsOn: 0 | 1 = 1
): ArrayBuffer {
  const items = schedules.map((schedule) => ({
    schedule,
    sourceLabel: schedules.length > 1 ? schedule.title : undefined,
  }));
  return buildScheduleWorkbook(items, weekStartsOn, title);
}

/** Функция `downloadWorkbook`. */
export async function downloadWorkbook(buffer: ArrayBuffer, filename: string): Promise<string> {
  const api = getAPI();
  const base64 = arrayBufferToBase64(buffer);
  const saved = await api.saveExcelFile(filename, base64);
  if (saved) return saved;

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return filename;
}

/** Функция `arrayBufferToBase64`. */
export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** @deprecated use importPlanningFromWorkbook */
export function parseExcelRows(buffer: ArrayBuffer): Record<string, string>[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
}
