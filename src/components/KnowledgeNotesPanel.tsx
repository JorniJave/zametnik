import { memo, useMemo, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  FileText,
  Calendar,
  CheckSquare,
  Folder,
  Brain,
  PenLine,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { NoteMeta } from '../types';
import { groupNotesByFolder } from '../lib/noteFolders';
import { CreateNoteModal } from './CreateNoteModal';

const TYPE_ICONS: Record<NoteMeta['type'], typeof FileText> = {
  daily: Calendar,
  task: CheckSquare,
  project: Folder,
  note: Brain,
  week: Calendar,
  canvas: Folder,
};

const FOLDER_PAGE = 40;

const NoteRow = memo(function NoteRow({
  note,
  active,
  onSelect,
}: {
  note: NoteMeta;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = TYPE_ICONS[note.type];
  return (
    <button
      type="button"
      className={`knowledge-note-row knowledge-note-row-nested ${active ? 'knowledge-note-row-active' : ''}`}
      onClick={() => onSelect(note.id)}
    >
      <Icon size={14} className="shrink-0 opacity-70" />
      <span className="truncate flex-1 text-left">{note.title}</span>
      {note.links.length > 0 && <span className="knowledge-note-links">{note.links.length}</span>}
    </button>
  );
});

const SYSTEM_NOTE_TYPES = new Set<NoteMeta['type']>(['daily', 'week', 'task', 'canvas']);

interface KnowledgeNotesPanelProps {
  selectedNoteId: string | null;
  onSelect: (id: string) => void;
  embedded?: boolean;
  /** Только текстовые заметки (без daily/задач/недель) — вкладка «Заметки» */
  textNotesOnly?: boolean;
}

/** Функция `KnowledgeNotesPanel`. */
export function KnowledgeNotesPanel({
  selectedNoteId,
  onSelect,
  embedded,
  textNotesOnly,
}: KnowledgeNotesPanelProps) {
  const notes = useAppStore((s) => s.notes);
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [folderLimits, setFolderLimits] = useState<Record<string, number>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(notes)
      .filter((n) => n.type !== 'canvas')
      .filter((n) => (!textNotesOnly || !SYSTEM_NOTE_TYPES.has(n.type)))
      .filter((n) => !q || n.title.toLowerCase().includes(q))
      .sort((a, b) => b.modified - a.modified);
  }, [notes, query, textNotesOnly]);

  const folders = useMemo(() => groupNotesByFolder(filtered), [filtered]);

  const handleCreate = useCallback(() => {
    setCreateOpen(true);
  }, []);

  const toggleFolder = useCallback((name: string) => {
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const showMore = useCallback((name: string) => {
    setFolderLimits((prev) => ({
      ...prev,
      [name]: (prev[name] ?? FOLDER_PAGE) + FOLDER_PAGE,
    }));
  }, []);

  return (
    <aside className={embedded ? 'note-dock-list' : textNotesOnly ? 'knowledge-notes-rail notes-rail-standalone' : 'knowledge-notes-rail'}>
      <CreateNoteModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <div className="knowledge-notes-rail-header">
        <span className="knowledge-notes-rail-title">Заметки</span>
        <button type="button" className="btn-icon-sm" onClick={handleCreate} title="Новая заметка">
          <Plus size={15} />
        </button>
      </div>
      <div className="knowledge-notes-search-wrap">
        <Search size={14} className="knowledge-notes-search-icon" aria-hidden />
        <input
          className="input knowledge-notes-search"
          placeholder="Поиск…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="knowledge-notes-list">
        {filtered.length === 0 ? (
          <p className="knowledge-notes-empty">Нет заметок. Создайте первую.</p>
        ) : (
          [...folders.entries()].map(([folder, items]) => {
            const isCollapsed = collapsed[folder];
            const limit = folderLimits[folder] ?? FOLDER_PAGE;
            const visible = items.slice(0, limit);
            const hasMore = items.length > limit;
            return (
              <div key={folder} className="knowledge-folder-group">
                <button type="button" className="knowledge-folder-header" onClick={() => toggleFolder(folder)}>
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  <Folder size={14} className="opacity-70" />
                  <span className="truncate">{folder}</span>
                  <span className="knowledge-note-links">{items.length}</span>
                </button>
                {!isCollapsed && (
                  <>
                    {visible.map((note) => (
                      <NoteRow
                        key={note.id}
                        note={note}
                        active={note.id === selectedNoteId}
                        onSelect={onSelect}
                      />
                    ))}
                    {hasMore && (
                      <button type="button" className="knowledge-notes-more" onClick={() => showMore(folder)}>
                        Ещё {items.length - limit}…
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
      <button type="button" className="knowledge-notes-create" onClick={handleCreate}>
        <PenLine size={14} />
        Новая заметка
      </button>
    </aside>
  );
}
