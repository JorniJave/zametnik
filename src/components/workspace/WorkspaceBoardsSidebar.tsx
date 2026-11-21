import { Plus, FileText } from 'lucide-react';
interface WorkspaceBoardsSidebarProps {
  workspaceList: { id: string; title: string }[];
  workspaceId: string | null;
  graphFilter: 'all' | 'tasks' | 'projects' | 'week';
  showAllNotes: boolean;
  onLoadWorkspace: (id: string) => void;
  onCreateBoard: () => void;
  onOpenPicker: () => void;
  onAddTextCard: () => void;
  onShowAllNotesChange: (value: boolean) => void;
  onGraphFilterChange: (filter: 'all' | 'tasks' | 'projects' | 'week') => void;
}

/** Функция `WorkspaceBoardsSidebar`. */
export function WorkspaceBoardsSidebar({
  workspaceList,
  workspaceId,
  graphFilter,
  showAllNotes,
  onLoadWorkspace,
  onCreateBoard,
  onOpenPicker,
  onAddTextCard,
  onShowAllNotesChange,
  onGraphFilterChange,
}: WorkspaceBoardsSidebarProps) {
  return (
    <aside
      className="w-52 shrink-0 border-r flex flex-col gap-2 p-2 hidden md:flex"
      style={{ borderColor: 'var(--border)' }}
    >
      <p className="text-xs font-semibold uppercase text-[var(--text-secondary)] px-1">Доски</p>
      {workspaceList.map((w) => (
        <button
          key={w.id}
          type="button"
          className={`text-left px-2 py-1.5 rounded-lg text-sm ${
            w.id === workspaceId ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'hover:bg-[var(--bg-secondary)]'
          }`}
          onClick={() => onLoadWorkspace(w.id)}
        >
          {w.title}
        </button>
      ))}
      <button type="button" className="btn-ghost text-sm justify-start" onClick={onCreateBoard}>
        <Plus size={14} /> Новая доска
      </button>
      <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />
      <button type="button" className="btn-ghost text-sm justify-start" onClick={onOpenPicker}>
        <Plus size={14} /> Добавить заметку
      </button>
      <button type="button" className="btn-ghost text-sm justify-start" onClick={onAddTextCard}>
        <FileText size={14} /> Текстовая карточка
      </button>
      <label className="flex items-center gap-2 text-xs px-1 text-[var(--text-secondary)]">
        <input type="checkbox" checked={showAllNotes} onChange={(e) => onShowAllNotesChange(e.target.checked)} />
        Все заметки на доске
      </label>
      <div className="flex flex-wrap gap-1 px-1">
        {(['all', 'tasks', 'projects', 'week'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`text-xs px-2 py-0.5 rounded ${graphFilter === f ? 'bg-[var(--accent)]/20' : 'bg-[var(--bg-secondary)]'}`}
            onClick={() => onGraphFilterChange(f)}
          >
            {f === 'all' ? 'Все' : f === 'tasks' ? 'Задачи' : f === 'projects' ? 'Проекты' : 'Неделя'}
          </button>
        ))}
      </div>
    </aside>
  );
}
