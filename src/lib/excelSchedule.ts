import XLSX from 'xlsx-js-style';
import type { ScheduleSlot, ScheduleTemplate } from '../types/planning';
import { createId, slotDescription } from './planning';

export const DAY_LABELS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] as const;
export const DAY_LABELS_FULL = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
] as const;

export const SCHEDULE_TABLE_HEADERS = ['День', 'Начало', 'Конец', 'Название', 'Описание', 'Шаблон'] as const;

const HEADER_FILL = { fgColor: { rgb: '2D3A5C' } };
const HEADER_FONT = { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 };
const BORDER = {
  top: { style: 'thin', color: { rgb: 'CCCCCC' } },
  bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
  left: { style: 'thin', color: { rgb: 'CCCCCC' } },
  right: { style: 'thin', color: { rgb: 'CCCCCC' } },
};
const ALT_FILL = { fgColor: { rgb: 'F5F7FB' } };

/** Функция `orderedWeekdays`. */
export function orderedWeekdays(weekStartsOn: 0 | 1): number[] {
  return weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
}

/** Функция `slotsForWeekdayExport`. */
export function slotsForWeekdayExport(slots: ScheduleSlot[], weekday: number): ScheduleSlot[] {
  return slots
    .filter((s) => s.weekdays.includes(weekday))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.startTime.localeCompare(b.startTime));
}

export interface ScheduleTableRow {
  weekday: number;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  source?: string;
}

/** Функция `collectScheduleTableRows`. */
export function collectScheduleTableRows(
  schedules: { schedule: ScheduleTemplate; sourceLabel?: string }[],
  weekStartsOn: 0 | 1
): ScheduleTableRow[] {
  const days = orderedWeekdays(weekStartsOn);
  const rows: ScheduleTableRow[] = [];

  for (const wd of days) {
    for (const { schedule, sourceLabel } of schedules) {
      for (const slot of slotsForWeekdayExport(schedule.slots, wd)) {
        rows.push({
          weekday: wd,
          startTime: slot.startTime,
          endTime: slot.endTime,
          title: slot.title,
          description: slotDescription(slot),
          source: sourceLabel ?? schedule.title,
        });
      }
    }
  }
  return rows;
}

/** Функция `cellRef`. */
function cellRef(row: number, col: number): string {
  return XLSX.utils.encode_cell({ r: row, c: col });
}

/** Функция `styleRange`. */
function styleRange(
  ws: XLSX.WorkSheet,
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  style: XLSX.CellObject['s']
) {
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const ref = cellRef(r, c);
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      ws[ref].s = { ...ws[ref].s, ...style };
    }
  }
}

/** Основной лист: одна строка = один пункт, удобно редактировать и импортировать. */
export function buildScheduleTableSheet(rows: ScheduleTableRow[]): XLSX.WorkSheet {
  const data: (string | number)[][] = [[...SCHEDULE_TABLE_HEADERS]];
  for (const row of rows) {
    data.push([
      DAY_LABELS_SHORT[row.weekday],
      row.startTime,
      row.endTime,
      row.title,
      row.description,
      row.source ?? '',
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 8 },
    { wch: 8 },
    { wch: 28 },
    { wch: 32 },
    { wch: 20 },
  ];

  const lastRow = data.length - 1;
  const lastCol = SCHEDULE_TABLE_HEADERS.length - 1;
  styleRange(ws, 0, 0, 0, lastCol, {
    fill: HEADER_FILL,
    font: HEADER_FONT,
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER,
  });

  for (let r = 1; r <= lastRow; r++) {
    const alt = r % 2 === 0 ? ALT_FILL : undefined;
    styleRange(ws, r, 0, r, lastCol, {
      fill: alt,
      alignment: { vertical: 'top', wrapText: true },
      border: BORDER,
    });
  }

  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' };
  return ws;
}

/** Визуальный лист: 7 дней × (время | название | описание). */
export function buildScheduleWeekSheet(
  rows: ScheduleTableRow[],
  weekStartsOn: 0 | 1
): XLSX.WorkSheet {
  const days = orderedWeekdays(weekStartsOn);
  const COLS_PER_DAY = 3;
  const totalCols = days.length * COLS_PER_DAY;

  const byDay = new Map<number, ScheduleTableRow[]>();
  for (const wd of days) byDay.set(wd, []);
  for (const row of rows) {
    byDay.get(row.weekday)?.push(row);
  }
  const maxRows = Math.max(1, ...days.map((wd) => byDay.get(wd)!.length));

  const grid: string[][] = [];
  const headerTop: string[] = [];
  const headerSub: string[] = [];
  for (const wd of days) {
    headerTop.push(DAY_LABELS_FULL[wd], '', '');
    headerSub.push('Время', 'Название', 'Описание');
  }
  grid.push(headerTop, headerSub);

  for (let r = 0; r < maxRows; r++) {
    const line: string[] = [];
    for (const wd of days) {
      const item = byDay.get(wd)![r];
      if (!item) {
        line.push('', '', '');
      } else {
        const time = `${item.startTime} – ${item.endTime}`;
        const title = item.source && rows.some((x) => x.source !== item.source)
          ? `${item.title} (${item.source})`
          : item.title;
        line.push(time, title, item.description);
      }
    }
    grid.push(line);
  }

  const ws = XLSX.utils.aoa_to_sheet(grid);
  const merges: XLSX.Range[] = [];
  for (let d = 0; d < days.length; d++) {
    merges.push({
      s: { r: 0, c: d * COLS_PER_DAY },
      e: { r: 0, c: d * COLS_PER_DAY + COLS_PER_DAY - 1 },
    });
  }
  ws['!merges'] = merges;

  ws['!cols'] = Array.from({ length: totalCols }, (_, i) => ({
    wch: i % COLS_PER_DAY === 0 ? 11 : i % COLS_PER_DAY === 1 ? 22 : 18,
  }));

  styleRange(ws, 0, 0, 0, totalCols - 1, {
    fill: HEADER_FILL,
    font: HEADER_FONT,
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER,
  });
  styleRange(ws, 1, 0, 1, totalCols - 1, {
    fill: { fgColor: { rgb: 'E8ECF4' } },
    font: { bold: true, sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER,
  });

  for (let r = 2; r < grid.length; r++) {
    styleRange(ws, r, 0, r, totalCols - 1, {
      fill: r % 2 === 0 ? ALT_FILL : undefined,
      alignment: { vertical: 'top', wrapText: true },
      border: BORDER,
    });
  }

  ws['!freeze'] = { xSplit: 0, ySplit: 2, topLeftCell: 'A3', activePane: 'bottomLeft' };
  return ws;
}

/** Функция `sheetNameFromTitle`. */
export function sheetNameFromTitle(title: string): string {
  return title.replace(/[\\/*?:[\]]/g, '').slice(0, 31) || 'Расписание';
}

/** Функция `writeStyledWorkbook`. */
export function writeStyledWorkbook(sheets: { name: string; sheet: XLSX.WorkSheet }[]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const { name, sheet } of sheets) {
    XLSX.utils.book_append_sheet(wb, sheet, name);
  }
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

/** @deprecated use buildScheduleTableSheet */
export function buildFlatImportRows(schedule: ScheduleTemplate): (string | number)[][] {
  const rows = collectScheduleTableRows([{ schedule }], 1);
  const data: (string | number)[][] = [[...SCHEDULE_TABLE_HEADERS]];
  for (const row of rows) {
    data.push([
      DAY_LABELS_SHORT[row.weekday],
      row.startTime,
      row.endTime,
      row.title,
      row.description,
      schedule.title,
    ]);
  }
  return data;
}

const DAY_PARSE: Record<string, number> = {
  вс: 0,
  воскресенье: 0,
  sun: 0,
  sunday: 0,
  пн: 1,
  понедельник: 1,
  mon: 1,
  monday: 1,
  вт: 2,
  вторник: 2,
  tue: 2,
  tuesday: 2,
  ср: 3,
  среда: 3,
  wed: 3,
  wednesday: 3,
  чт: 4,
  четверг: 4,
  thu: 4,
  thursday: 4,
  пт: 5,
  пятница: 5,
  fri: 5,
  friday: 5,
  сб: 6,
  суббота: 6,
  sat: 6,
  saturday: 6,
};

/** Функция `parseWeekdayLabel`. */
export function parseWeekdayLabel(raw: string): number | null {
  const key = raw.trim().toLowerCase().replace(/\./g, '');
  if (key in DAY_PARSE) return DAY_PARSE[key];
  const num = Number(key);
  if (Number.isInteger(num) && num >= 0 && num <= 6) return num;
  return null;
}

/** Функция `tableRowsToSchedule`. */
export function tableRowsToSchedule(
  tableRows: ScheduleTableRow[],
  defaultTitle: string
): ScheduleTemplate {
  const slots: ScheduleSlot[] = tableRows.map((row, i) => ({
    id: createId(),
    weekdays: [row.weekday],
    startTime: row.startTime,
    endTime: row.endTime,
    title: row.title,
    description: row.description || undefined,
    sortOrder: i * 10,
  }));

  return {
    id: createId(),
    title: defaultTitle,
    slots,
    exceptions: [],
  };
}

/** Функция `groupTableRowsBySource`. */
export function groupTableRowsBySource(rows: ScheduleTableRow[]): Map<string, ScheduleTableRow[]> {
  const map = new Map<string, ScheduleTableRow[]>();
  for (const row of rows) {
    const key = row.source?.trim() || 'Расписание';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return map;
}

export { XLSX };
