import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatDate, titleToId } from '../lib/parser';
import { tasksForToday } from '../lib/planning';
import { noteBody, renderNoteHtml, restoreFrontmatter } from '../lib/noteRead';
import { MarkdownEditor } from './MarkdownEditor';

/** Экран дня: список дел. Текст дня прячется за «Подробнее». */
export function TodayView() {
  const planning = useAppStore((s) => s.planning);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const openToday = useAppStore((s) => s.openToday);
  const activeNote = useAppStore((s) => s.activeNote);
  const saveActiveNote = useAppStore((s) => s.saveActiveNote);
  const [details, setDetails] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const today = formatDate(new Date());
  const todayNoteId = titleToId(today);

  useEffect(() => {
    if (useAppStore.getState().activeNoteId !== todayNoteId) void openToday();
  }, [openToday, todayNoteId]);

  useEffect(() => {
    if (!editing && activeNote?.id === todayNoteId) setDraft(noteBody(activeNote.content));
  }, [activeNote?.id, activeNote?.content, todayNoteId, editing]);

  const tasks = tasksForToday(planning.tasks, today, todayNoteId);
  const html = activeNote?.id === todayNoteId ? renderNoteHtml(activeNote.content) : '';

  return (
    <div className="today-view">
      <div className="today-summary p-4 md:p-6 w-full max-w-2xl mx-auto space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Сегодня</h1>
            <p className="text-sm text-[var(--text-secondary)]">{today}</p>
          </div>
          <button type="button" className="btn-ghost text-sm" onClick={() => { setDetails((v) => !v); setEditing(false); }}>
            {details ? 'Скрыть' : 'Подробнее'}
          </button>
        </div>

        {tasks.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">На сегодня ничего нет. Новую задачу можно добавить во вкладке «Задачи».</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-3 p-3 rounded-xl border panel" style={{ borderColor: 'var(--border)' }}>
                <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} />
                <span className="text-sm flex-1">{task.title}</span>
                {task.priority === 'high' && <span className="text-xs text-[var(--accent)]">важно</span>}
                {task.dueTime && <span className="text-xs text-[var(--text-secondary)]">до {task.dueTime}</span>}
                {task.project && <span className="text-xs text-[var(--text-secondary)]">{task.project}</span>}
              </li>
            ))}
          </ul>
        )}

        {details && (
          <section className="rounded-xl border panel overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-semibold">Заметка дня</h2>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => {
                  if (editing && activeNote) void saveActiveNote(restoreFrontmatter(activeNote.content, draft));
                  setEditing((v) => !v);
                }}
              >
                {editing ? 'Готово' : 'Править'}
              </button>
            </div>
            {editing ? (
              <div className="h-80">
                <MarkdownEditor
                  noteId={todayNoteId}
                  content={draft}
                  onChange={setDraft}
                  onSave={(text) => {
                    if (!activeNote) return;
                    void saveActiveNote(restoreFrontmatter(activeNote.content, text));
                  }}
                />
              </div>
            ) : (
              <div className="note-read p-4" dangerouslySetInnerHTML={{ __html: html }} />
            )}
          </section>
        )}
      </div>
    </div>
  );
}
