import type { StructuredTask } from '../types/planning';
import { getTodayStr } from './planning';

/** Функция `getTaskReminderAt`. */
export function getTaskReminderAt(
  task: StructuredTask,
  defaultReminderMinutes: number
): number | null {
  if (task.done || !task.dueDate || task.noteId) return null;
  const minutes = task.reminderMinutes ?? defaultReminderMinutes;
  const [y, m, d] = task.dueDate.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  if (task.dueTime) {
    const [h, min] = task.dueTime.split(':').map(Number);
    due.setHours(h, min, 0, 0);
  } else {
    due.setHours(9, 0, 0, 0);
  }
  return due.getTime() - minutes * 60_000;
}

/** Функция `getTaskDueAt`. */
export function getTaskDueAt(task: StructuredTask): number | null {
  if (task.done || !task.dueDate || task.noteId) return null;
  const [y, m, d] = task.dueDate.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  if (task.dueTime) {
    const [h, min] = task.dueTime.split(':').map(Number);
    due.setHours(h, min, 0, 0);
  } else {
    due.setHours(23, 59, 0, 0);
  }
  return due.getTime();
}

/** Функция `reminderBody`. */
export function reminderBody(task: StructuredTask): string {
  const parts: string[] = [];
  if (task.dueDate) parts.push(task.dueDate);
  if (task.dueTime) parts.push(`до ${task.dueTime}`);
  if (task.project) parts.push(task.project);
  return parts.join(' · ') || 'Срок подходит';
}

/** Функция `tasksDueForReminder`. */
export function tasksDueForReminder(
  tasks: StructuredTask[],
  defaultMinutes: number,
  now = Date.now(),
  windowMs = 60_000
): { task: StructuredTask; kind: 'remind' | 'due' }[] {
  clearExpiredSnoozes(now);
  const out: { task: StructuredTask; kind: 'remind' | 'due' }[] = [];
  for (const task of tasks) {
    const remindAt = getTaskReminderAt(task, defaultMinutes);
    if (remindAt !== null && now >= remindAt && now < remindAt + windowMs) {
      if (!isSnoozed(task.id, 'remind', now)) out.push({ task, kind: 'remind' });
      continue;
    }
    const dueAt = getTaskDueAt(task);
    if (dueAt !== null && task.dueTime && now >= dueAt && now < dueAt + windowMs) {
      if (!isSnoozed(task.id, 'due', now)) out.push({ task, kind: 'due' });
    }
  }
  return out;
}

/** Функция `formatReminderKey`. */
export function formatReminderKey(taskId: string, kind: string, date = getTodayStr()): string {
  return `${taskId}:${kind}:${date}`;
}

const SNOOZE_KEY = 'zametnik-snoozed';

type SnoozeMap = Record<string, number>;

/** Функция `readSnoozes`. */
function readSnoozes(): SnoozeMap {
  try {
    return JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/** Функция `writeSnoozes`. */
function writeSnoozes(map: SnoozeMap) {
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(map));
}

/** Функция `snoozeReminder`. */
export function snoozeReminder(taskId: string, kind: string, minutes: number): void {
  const map = readSnoozes();
  map[formatReminderKey(taskId, kind)] = Date.now() + minutes * 60_000;
  writeSnoozes(map);
}

/** Функция `isSnoozed`. */
export function isSnoozed(taskId: string, kind: string, now = Date.now()): boolean {
  const until = readSnoozes()[formatReminderKey(taskId, kind)];
  return until !== undefined && now < until;
}

/** Функция `clearExpiredSnoozes`. */
export function clearExpiredSnoozes(now = Date.now()): void {
  const map = readSnoozes();
  let changed = false;
  for (const [k, until] of Object.entries(map)) {
    if (until <= now) {
      delete map[k];
      changed = true;
    }
  }
  if (changed) writeSnoozes(map);
}
