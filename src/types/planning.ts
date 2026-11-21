export type TaskPriority = 'low' | 'normal' | 'high';
export type TaskStatus = 'inbox' | 'today' | 'scheduled' | 'done';

export interface StructuredTask {
  id: string;
  title: string;
  done: boolean;
  status: TaskStatus;
  dueDate?: string;
  dueTime?: string;
  priority: TaskPriority;
  project?: string;
  tags: string[];
  noteId?: string;
  reminderMinutes?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  location?: string;
  description?: string;
  color?: string;
  scheduleSlotId?: string;
  scheduleId?: string;
}

export interface ScheduleSlot {
  id: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  title: string;
  /** Порядок внутри столбца дня (меньше — выше) */
  sortOrder?: number;
  /** @deprecated use description */
  location?: string;
  description?: string;
  teacher?: string;
  color?: string;
}

export interface ScheduleException {
  date: string;
  slotId: string;
  cancelled?: boolean;
  title?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
}

export interface ScheduleTemplate {
  id: string;
  title: string;
  validFrom?: string;
  validTo?: string;
  slots: ScheduleSlot[];
  exceptions: ScheduleException[];
  color?: string;
}

/** Объединённый вид нескольких шаблонов (школа + спорт и т.д.) */
export interface ScheduleCombo {
  id: string;
  title: string;
  scheduleIds: string[];
}

export interface ReminderItem {
  id: string;
  targetId: string;
  targetType: 'task' | 'event';
  title: string;
  fireAt: number;
  snoozedUntil?: number;
  dismissed?: boolean;
}

export interface PlanningData {
  schemaVersion: number;
  tasks: StructuredTask[];
  events: CalendarEvent[];
  schedules: ScheduleTemplate[];
  combos: ScheduleCombo[];
  reminders: ReminderItem[];
}

export const EMPTY_PLANNING: PlanningData = {
  schemaVersion: 1,
  tasks: [],
  events: [],
  schedules: [],
  combos: [],
  reminders: [],
};
