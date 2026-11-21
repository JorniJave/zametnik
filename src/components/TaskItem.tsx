import { useState, useEffect } from 'react';
import { Trash2, FileText, Pencil, Bell } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { isOverdue } from '../lib/planning';
import { formatDateRu } from '../lib/dates';
import type { StructuredTask } from '../types/planning';
import { DateRuInput } from './DateRuInput';
import { ReminderMinutesInput } from './ReminderMinutesInput';

interface TaskItemProps {
  task: StructuredTask;
  today: string;
  compact?: boolean;
}

/** Функция `TaskItem`. */
export function TaskItem({ task, today, compact = false }: TaskItemProps) {
  const toggleTask = useAppStore((s) => s.toggleTask);
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const openNote = useAppStore((s) => s.openNote);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const defaultReminder = useAppStore((s) => s.settings?.defaultReminderMinutes ?? 15);
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(task.title);
  const fromNote = Boolean(task.noteId);

  useEffect(() => {
    setTitle(task.title);
  }, [task.title, task.id]);

  /** Функция `saveTitle`. */
  const saveTitle = () => {
    if (!fromNote && title.trim() && title !== task.title) {
      updateTask(task.id, { title: title.trim() });
    }
  };

  const remindLabel =
    task.reminderMinutes !== undefined
      ? `${task.reminderMinutes} мин`
      : task.dueDate
        ? `${defaultReminder} мин (авто)`
        : null;

  return (
    <li
      className={`rounded-lg border panel overflow-hidden`}
      style={{ borderColor: isOverdue(task, today) && !task.done ? 'var(--accent)' : 'var(--border)' }}
    >
      <div className={`flex items-start gap-2 ${compact ? 'p-1.5' : 'p-3'}`}>
        <input
          type="checkbox"
          className="mt-1 shrink-0"
          checked={task.done}
          onChange={() => toggleTask(task.id)}
        />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${task.done ? 'line-through opacity-60' : ''}`}>{task.title}</div>
          <div className="text-xs text-[var(--text-secondary)] flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
            {task.dueDate && <span>{formatDateRu(task.dueDate)}</span>}
            {task.dueTime && <span>до {task.dueTime}</span>}
            {remindLabel && task.dueDate && (
              <span className="flex items-center gap-0.5">
                <Bell size={10} /> −{remindLabel}
              </span>
            )}
            {task.project && <span>· {task.project}</span>}
            {task.priority === 'high' && <span className="text-[var(--accent)]">высокий</span>}
            {isOverdue(task, today) && !task.done && <span className="text-[var(--accent)]">просрочено</span>}
            {fromNote && <span className="text-[var(--accent)]">из заметки</span>}
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          {fromNote ? (
            <button
              type="button"
              className="btn-icon"
              title="Открыть заметку"
              onClick={() => {
                if (task.noteId) {
                  openNote(task.noteId);
                  setViewMode('notes');
                }
              }}
            >
              <FileText size={14} />
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-icon"
                title="Редактировать"
                onClick={() => setExpanded((v) => !v)}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className="btn-icon"
                title="Удалить"
                onClick={() => deleteTask(task.id)}
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
      {expanded && !fromNote && (
        <div className="px-3 pb-3 grid grid-cols-2 gap-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <label className="text-xs text-[var(--text-secondary)] col-span-2">
            Название
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              className="mt-0.5 w-full px-2 py-1 rounded border text-xs bg-[var(--bg-secondary)] border-[var(--border)]"
            />
          </label>
          <label className="text-xs text-[var(--text-secondary)]">
            Дата (ДД.ММ.ГГГГ)
            <DateRuInput
              value={task.dueDate ?? ''}
              onChange={(iso) => updateTask(task.id, { dueDate: iso || undefined })}
              className="mt-0.5 w-full px-2 py-1 rounded border text-xs bg-[var(--bg-secondary)] border-[var(--border)]"
            />
          </label>
          <label className="text-xs text-[var(--text-secondary)]">
            Выполнить до
            <input
              type="time"
              value={task.dueTime ?? ''}
              onChange={(e) => updateTask(task.id, { dueTime: e.target.value || undefined })}
              className="mt-0.5 w-full px-2 py-1 rounded border text-xs bg-[var(--bg-secondary)] border-[var(--border)]"
            />
          </label>
          <div className="text-xs text-[var(--text-secondary)] col-span-2">
            <span className="flex items-center gap-1 mb-1">
              <Bell size={12} /> Напоминание
            </span>
            <ReminderMinutesInput
              value={task.reminderMinutes}
              onChange={(m) => updateTask(task.id, { reminderMinutes: m })}
            />
          </div>
          <label className="text-xs text-[var(--text-secondary)] col-span-2">
            Проект
            <input
              value={task.project ?? ''}
              placeholder="Учёба..."
              onChange={(e) => updateTask(task.id, { project: e.target.value || undefined })}
              className="mt-0.5 w-full px-2 py-1 rounded border text-xs bg-[var(--bg-secondary)] border-[var(--border)]"
            />
          </label>
        </div>
      )}
    </li>
  );
}
