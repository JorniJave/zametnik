import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { formatDate, getWeekDays, getWeekStart } from '../lib/parser';
import { getEventsForDate, isPastDate } from '../lib/planning';
import { TaskItem } from './TaskItem';

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/** Функция `PlannerCalendarView`. */
export function PlannerCalendarView() {
  const planning = useAppStore((s) => s.planning);
  const settings = useAppStore((s) => s.settings);
  const addTask = useAppStore((s) => s.addTask);
  const [cursor, setCursor] = useState(() => new Date());
  const [mode, setMode] = useState<'week' | 'day'>('week');
  const [selectedDate, setSelectedDate] = useState<string | null>(formatDate(new Date()));
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');

  const today = formatDate(new Date());
  const weekStart = getWeekStart(cursor, settings?.weekStartsOn ?? 1);
  const days = mode === 'week' ? getWeekDays(weekStart) : [cursor];

  const eventsByDay = useMemo(() => {
    const map: Record<string, ReturnType<typeof getEventsForDate>> = {};
    for (const d of days) {
      const ds = formatDate(d);
      map[ds] = getEventsForDate(planning, ds);
    }
    return map;
  }, [days, planning]);

  const selectedEvents = selectedDate ? getEventsForDate(planning, selectedDate) : [];
  const selectedTasks = selectedDate
    ? planning.tasks.filter((t) => t.dueDate === selectedDate)
    : [];

  /** Функция `shift`. */
  const shift = (n: number) => {
    const d = new Date(cursor);
    d.setDate(d.getDate() + (mode === 'week' ? n * 7 : n));
    setCursor(d);
  };

  /** Функция `openDay`. */
  const openDay = (ds: string) => {
    setSelectedDate(ds);
    const [y, m, day] = ds.split('-').map(Number);
    setCursor(new Date(y, m - 1, day));
  };

  /** Функция `addTaskForDay`. */
  const addTaskForDay = async () => {
    if (!selectedDate || !newTaskTitle.trim()) return;
    await addTask({
      title: newTaskTitle.trim(),
      dueDate: selectedDate,
      dueTime: newTaskTime || undefined,
    });
    setNewTaskTitle('');
    setNewTaskTime('');
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl font-bold">Календарь</h1>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-icon" onClick={() => shift(-1)}>
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => {
                setCursor(new Date());
                setSelectedDate(today);
              }}
            >
              Сегодня
            </button>
            <button type="button" className="btn-icon" onClick={() => shift(1)}>
              <ChevronRight size={18} />
            </button>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'week' | 'day')}
              className="ml-2 px-2 py-1 rounded-lg border text-sm bg-[var(--bg-secondary)] border-[var(--border)]"
            >
              <option value="week">Неделя</option>
              <option value="day">День</option>
            </select>
          </div>
        </div>

        <div
          className={`grid gap-3 ${mode === 'week' ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7' : 'grid-cols-1 max-w-xl'}`}
        >
          {days.map((d) => {
            const ds = formatDate(d);
            const isToday = ds === today;
            const isSelected = ds === selectedDate;
            const isPast = isPastDate(ds, today);
            const events = eventsByDay[ds] ?? [];
            const taskCount = planning.tasks.filter((t) => t.dueDate === ds && !t.done).length;
            const dow = DAY_NAMES[d.getDay()];
            return (
              <button
                key={ds}
                type="button"
                onClick={() => openDay(ds)}
                className={`rounded-xl border p-3 min-h-[100px] panel text-left transition-all hover:border-[var(--accent)]/50 cursor-pointer ${
                  isSelected ? 'ring-2 ring-[var(--accent)] border-[var(--accent)]' : ''
                } ${isToday ? 'bg-[var(--accent)]/5' : ''} ${isPast && !isToday ? 'opacity-80' : ''}`}
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex justify-between items-baseline mb-1">
                  <span className={`text-sm font-semibold ${isToday ? 'text-[var(--accent)]' : ''}`}>{dow}</span>
                  <span className="text-xs text-[var(--text-secondary)]">{ds.slice(5)}</span>
                </div>
                <ul className="space-y-1 pointer-events-none">
                  {events.slice(0, 3).map((ev) => (
                    <li
                      key={ev.id}
                      className="text-xs p-1 rounded truncate"
                      style={{ background: `${ev.color ?? 'var(--accent)'}22` }}
                    >
                      {ev.startTime} {ev.title}
                    </li>
                  ))}
                  {taskCount > 0 && (
                    <li className="text-xs text-[var(--accent)]">
                      {taskCount} {taskCount === 1 ? 'задача' : 'задачи'}
                    </li>
                  )}
                  {events.length === 0 && taskCount === 0 && (
                    <li className="text-xs text-[var(--text-secondary)] italic">Нажмите для деталей</li>
                  )}
                </ul>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <aside
          className="w-full md:w-96 shrink-0 border-t md:border-t-0 md:border-l p-4 overflow-y-auto panel"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2 className="font-semibold mb-1">{selectedDate}</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-1">День подробно</p>
          {isPastDate(selectedDate, today) && (
            <p className="text-xs text-[var(--accent)] mb-3">Дата в прошлом — можно добавить задачу для учёта</p>
          )}

          <section className="mb-4">
            <h3 className="text-xs font-semibold uppercase text-[var(--text-secondary)] mb-2">Расписание</h3>
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] italic">Нет событий</p>
            ) : (
              <ul className="space-y-2">
                {selectedEvents.map((ev) => (
                  <li key={ev.id} className="p-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)' }}>
                    <div className="font-medium">
                      {ev.startTime}
                      {ev.endTime ? ` – ${ev.endTime}` : ''} · {ev.title}
                    </div>
                    {(ev.description || ev.location) && (
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {ev.description || ev.location}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase text-[var(--text-secondary)] mb-2">Задачи</h3>
            {selectedTasks.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] italic mb-2">Нет задач</p>
            ) : (
              <ul className="space-y-2 mb-3">
                {selectedTasks.map((t) => (
                  <TaskItem key={t.id} task={t} today={today} compact />
                ))}
              </ul>
            )}
            <div className="space-y-2">
              <input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Задача на этот день..."
                className="w-full px-2 py-1.5 rounded border text-sm bg-[var(--bg-secondary)] border-[var(--border)]"
                onKeyDown={(e) => e.key === 'Enter' && addTaskForDay()}
              />
              <div className="flex gap-2">
                <label className="flex-1 text-xs text-[var(--text-secondary)] flex items-center gap-1">
                  <Clock size={12} />
                  <input
                    type="time"
                    value={newTaskTime}
                    onChange={(e) => setNewTaskTime(e.target.value)}
                    className="flex-1 px-2 py-1 rounded border text-sm bg-[var(--bg-secondary)] border-[var(--border)]"
                  />
                </label>
                <button type="button" className="btn-primary px-3" onClick={addTaskForDay}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </section>
        </aside>
      )}
    </div>
  );
}
