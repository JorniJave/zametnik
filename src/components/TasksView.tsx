import { useState } from 'react';
import { Plus, Clock, Bell } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { formatDate } from '../lib/parser';
import { formatDateRu } from '../lib/dates';
import { isOverdue, isToday } from '../lib/planning';
import type { TaskPriority } from '../types/planning';
import { TaskItem } from './TaskItem';
import { DateRuInput } from './DateRuInput';
import { ReminderMinutesInput } from './ReminderMinutesInput';
import { ViewHelpBanner } from './ViewHelpBanner';
import { HelpButton } from './HelpButton';

type Tab = 'nodate' | 'today' | 'upcoming' | 'overdue' | 'done';

const TAB_HINTS: Record<Tab, string> = {
  nodate: 'Без срока — быстрый список «сделать когда-нибудь». Назначьте дату через карандаш.',
  today: 'Задачи на сегодня — дата подставляется автоматически',
  upcoming: 'Запланированные задачи — укажите дату в формате ДД.ММ.ГГГГ',
  overdue: 'Просроченные — отметьте выполненными или перенесите дату',
  done: 'Выполненные задачи',
};

/** Функция `TasksView`. */
export function TasksView() {
  const planning = useAppStore((s) => s.planning);
  const addTask = useAppStore((s) => s.addTask);
  const [tab, setTab] = useState<Tab>('today');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number | undefined>();
  const [project, setProject] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');

  const today = formatDate(new Date());
  const canAdd = tab === 'nodate' || tab === 'today' || tab === 'upcoming';
  const showDate = tab === 'upcoming';
  const showTime = tab === 'today' || tab === 'upcoming';
  const showReminder = tab === 'today' || tab === 'upcoming';

  const filtered = planning.tasks.filter((t) => {
    if (tab === 'done') return t.done;
    if (t.done) return false;
    if (tab === 'nodate') return !t.dueDate;
    if (tab === 'today') return isToday(t, today);
    if (tab === 'overdue') return isOverdue(t, today);
    if (tab === 'upcoming') return t.dueDate && t.dueDate > today;
    return true;
  });

  /** Функция `submit`. */
  const submit = async () => {
    if (!title.trim()) return;
    if (tab === 'upcoming' && !dueDate) return;
    let date: string | undefined;
    if (tab === 'today') date = today;
    else if (tab === 'upcoming') date = dueDate || undefined;
    await addTask({
      title: title.trim(),
      dueDate: date,
      dueTime: showTime && dueTime ? dueTime : undefined,
      reminderMinutes: showReminder ? reminderMinutes : undefined,
      project: project.trim() || undefined,
      priority,
    });
    setTitle('');
    setDueDate('');
    setDueTime('');
    setReminderMinutes(undefined);
    setProject('');
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'nodate', label: 'Без даты' },
    { id: 'today', label: 'Сегодня' },
    { id: 'upcoming', label: 'Предстоящие' },
    { id: 'overdue', label: 'Просроченные' },
    { id: 'done', label: 'Готово' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
        Задачи
        <HelpButton helpId="tasks" />
      </h1>
      <p className="text-sm text-[var(--text-secondary)] mb-4">{TAB_HINTS[tab]}</p>

      <ViewHelpBanner id="tasks" title="Как пользоваться задачами">
        <p>• <strong>Без даты</strong> — идеи без срока. • <strong>Сегодня</strong> — дата уже сегодня.</p>
        <p>• Нажмите <strong>карандаш</strong> на задаче — дата, время, напоминание, проект.</p>
        <p>• Задачи с <strong>«из заметки»</strong> редактируются в разделе Заметки (чекбокс в тексте).</p>
      </ViewHelpBanner>

      <div className="flex flex-wrap gap-1 mb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              tab === t.id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {canAdd && (
        <div className="mb-4 p-4 rounded-xl border panel space-y-2" style={{ borderColor: 'var(--border)' }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Что нужно сделать?"
            className="w-full px-3 py-2 rounded-lg border bg-[var(--bg-secondary)] border-[var(--border)] text-sm"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />

          {tab === 'today' && (
            <p className="text-xs text-[var(--text-secondary)]">
              Дата: <strong>{formatDateRu(today)}</strong> (сегодня)
            </p>
          )}

          <div className={`grid gap-2 ${showDate || showTime ? 'grid-cols-2 sm:grid-cols-2' : 'grid-cols-1'}`}>
            {showDate && (
              <label className="text-xs text-[var(--text-secondary)] flex flex-col gap-1">
                Дата (ДД.ММ.ГГГГ)
                <DateRuInput
                  value={dueDate}
                  onChange={setDueDate}
                  className="px-2 py-1.5 rounded-lg border bg-[var(--bg-secondary)] border-[var(--border)] text-sm w-full"
                />
              </label>
            )}
            {showTime && (
              <label className="text-xs text-[var(--text-secondary)] flex flex-col gap-1">
                <span className="flex items-center gap-1">
                  <Clock size={12} /> Выполнить до
                </span>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border bg-[var(--bg-secondary)] border-[var(--border)] text-sm"
                />
              </label>
            )}
          </div>

          {showReminder && (
            <label className="text-xs text-[var(--text-secondary)] block">
              <span className="flex items-center gap-1 mb-1">
                <Bell size={12} /> Напомнить за (минут)
              </span>
              <ReminderMinutesInput value={reminderMinutes} onChange={setReminderMinutes} />
            </label>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-[var(--text-secondary)] flex flex-col gap-1">
              Проект
              <input
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="Учёба..."
                className="px-2 py-1.5 rounded-lg border bg-[var(--bg-secondary)] border-[var(--border)] text-sm"
              />
            </label>
            <label className="text-xs text-[var(--text-secondary)] flex flex-col gap-1">
              Приоритет
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="px-2 py-1.5 rounded-lg border bg-[var(--bg-secondary)] border-[var(--border)] text-sm"
              >
                <option value="low">Низкий</option>
                <option value="normal">Обычный</option>
                <option value="high">Высокий</option>
              </select>
            </label>
          </div>

          {showDate && dueDate && dueDate < today && (
            <p className="text-xs text-[var(--accent)]">Дата в прошлом — задача попадёт в «Просроченные»</p>
          )}
          <button className="btn-primary w-full sm:w-auto" type="button" onClick={submit}>
            <Plus size={16} /> Добавить задачу
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {filtered.map((t) => (
          <TaskItem key={t.id} task={t} today={today} />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-[var(--text-secondary)] italic py-8 text-center">Список пуст</p>
        )}
      </ul>
    </div>
  );
}
