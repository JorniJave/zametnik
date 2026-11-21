import type {
  CalendarEvent,
  PlanningData,
  ScheduleException,
  ScheduleSlot,
  ScheduleTemplate,
  StructuredTask,
} from '../types/planning';
import { EMPTY_PLANNING } from '../types/planning';
import type { NoteMeta } from '../types';
import { formatDate } from './parser';

/** Функция `createId`. */
export function createId(): string {
  return crypto.randomUUID();
}

/** Функция `normalizePlanning`. */
export function normalizePlanning(data: Partial<PlanningData> | null | undefined): PlanningData {
  if (!data) return { ...EMPTY_PLANNING };
  return {
    schemaVersion: data.schemaVersion ?? 1,
    tasks: data.tasks ?? [],
    events: data.events ?? [],
    schedules: data.schedules ?? [],
    combos: data.combos ?? [],
    reminders: data.reminders ?? [],
  };
}

/** Функция `tasksFromNotes`. */
export function tasksFromNotes(notes: Record<string, NoteMeta>): StructuredTask[] {
  const out: StructuredTask[] = [];
  for (const note of Object.values(notes)) {
    for (const t of note.tasks) {
      out.push({
        id: `${note.id}:${t.line}`,
        title: t.text,
        done: t.done,
        status: t.done ? 'done' : 'inbox',
        priority: 'normal',
        tags: note.tags,
        noteId: note.id,
        createdAt: note.modified,
        updatedAt: note.modified,
      });
    }
  }
  return out;
}

/** Функция `mergeTasks`. */
export function mergeTasks(
  structured: StructuredTask[],
  fromNotes: StructuredTask[]
): StructuredTask[] {
  const byId = new Map(structured.map((t) => [t.id, t]));
  for (const t of fromNotes) {
    if (!byId.has(t.id)) byId.set(t.id, t);
  }
  return [...byId.values()];
}

/** Функция `getTodayStr`. */
export function getTodayStr(): string {
  return formatDate(new Date());
}

/** Функция `computeTaskStatus`. */
export function computeTaskStatus(
  task: Pick<StructuredTask, 'done' | 'dueDate'>,
  today = getTodayStr()
): StructuredTask['status'] {
  if (task.done) return 'done';
  if (!task.dueDate) return 'inbox';
  if (task.dueDate === today) return 'today';
  return 'scheduled';
}

/** Функция `isPastDate`. */
export function isPastDate(dateStr: string, today = getTodayStr()): boolean {
  return dateStr < today;
}

/** Функция `slotDescription`. */
export function slotDescription(slot: ScheduleSlot): string {
  return slot.description ?? slot.location ?? '';
}

/** Функция `isOverdue`. */
export function isOverdue(task: StructuredTask, today = getTodayStr(), now = new Date()): boolean {
  if (task.done || !task.dueDate) return false;
  if (task.dueDate < today) return true;
  if (task.dueDate === today && task.dueTime) {
    const [h, m] = task.dueTime.split(':').map(Number);
    const deadline = new Date(now);
    deadline.setHours(h, m, 0, 0);
    return now > deadline;
  }
  return false;
}

/** Функция `isToday`. */
export function isToday(task: StructuredTask, today = getTodayStr()): boolean {
  if (task.done) return false;
  return task.status === 'today' || sameDay(task.dueDate, today);
}

/** Задачи экрана «Сегодня»: с датой на сегодня, со статусом today и чекбоксы дневной заметки. */
export function tasksForToday(
  tasks: StructuredTask[],
  today = getTodayStr(),
  todayNoteId?: string
): StructuredTask[] {
  const rank = (task: StructuredTask) => (task.priority === 'high' ? 0 : task.priority === 'low' ? 2 : 1);
  return tasks
    .filter((task) => {
      if (task.done) return false;
      if (task.status === 'today' || sameDay(task.dueDate, today)) return true;
      return Boolean(todayNoteId && task.noteId === todayNoteId);
    })
    .sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title, 'ru'));
}

function sameDay(value: string | undefined, today: string): boolean {
  if (!value) return false;
  if (value === today) return true;
  const iso = value.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!iso) return false;
  const day = iso[1].padStart(2, '0');
  const month = iso[2].padStart(2, '0');
  return `${iso[3]}-${month}-${day}` === today;
}

/** Функция `slotAppliesOnDate`. */
export function slotAppliesOnDate(
  slot: ScheduleSlot,
  dateStr: string,
  schedule: ScheduleTemplate
): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (schedule.validFrom && dateStr < schedule.validFrom) return false;
  if (schedule.validTo && dateStr > schedule.validTo) return false;
  if (!slot.weekdays.includes(date.getDay())) return false;
  const exc = schedule.exceptions.find((e) => e.date === dateStr && e.slotId === slot.id);
  if (exc?.cancelled) return false;
  return true;
}

/** Функция `materializeScheduleForDate`. */
export function materializeScheduleForDate(
  schedule: ScheduleTemplate,
  dateStr: string
): CalendarEvent[] {
  return schedule.slots
    .filter((slot) => slotAppliesOnDate(slot, dateStr, schedule))
    .map((slot) => {
      const exc = schedule.exceptions.find((e) => e.date === dateStr && e.slotId === slot.id);
      return {
        id: `${schedule.id}:${slot.id}:${dateStr}`,
        title: exc?.title ?? slot.title,
        date: dateStr,
        startTime: exc?.startTime ?? slot.startTime,
        endTime: exc?.endTime ?? slot.endTime,
        location: exc?.location ?? slot.location,
        description:
          slotDescription(slot) || (slot.teacher ? `Преподаватель: ${slot.teacher}` : undefined),
        color: slot.color ?? schedule.color,
        scheduleSlotId: slot.id,
        scheduleId: schedule.id,
      };
    });
}

/** Функция `getEventsForDate`. */
export function getEventsForDate(planning: PlanningData, dateStr: string): CalendarEvent[] {
  const manual = planning.events.filter((e) => e.date === dateStr);
  const fromSchedules = planning.schedules.flatMap((s) => materializeScheduleForDate(s, dateStr));
  return [...fromSchedules, ...manual].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/** Функция `addScheduleException`. */
export function addScheduleException(
  schedule: ScheduleTemplate,
  exc: ScheduleException
): ScheduleTemplate {
  const rest = schedule.exceptions.filter(
    (e) => !(e.date === exc.date && e.slotId === exc.slotId)
  );
  return { ...schedule, exceptions: [...rest, exc] };
}
