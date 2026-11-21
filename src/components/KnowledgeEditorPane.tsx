import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { MarkdownEditor } from './MarkdownEditor';
import { noteBody, renderNoteHtml, restoreFrontmatter } from '../lib/noteRead';

interface KnowledgeEditorPaneProps {
  embedded?: boolean;
  /** Вкладка «Заметки» — редактор на всю оставшуюся ширину */
  fullWidth?: boolean;
}

/** Сначала читаемый текст, правка — по кнопке. Служебная шапка файла скрыта. */
export function KnowledgeEditorPane({ embedded = false, fullWidth = false }: KnowledgeEditorPaneProps) {
  const activeNoteId = useAppStore((s) => s.activeNoteId);
  const activeNote = useAppStore((s) => s.activeNote);
  const saveActiveNote = useAppStore((s) => s.saveActiveNote);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setEditing(false);
  }, [activeNote?.id]);

  useEffect(() => {
    if (activeNote && !editing) setDraft(noteBody(activeNote.content));
  }, [activeNote?.id, activeNote?.content, editing]);

  const paneClass = embedded
    ? 'note-dock-editor'
    : fullWidth
      ? 'knowledge-editor-pane knowledge-editor-full'
      : 'knowledge-editor-pane';
  const emptyClass = embedded
    ? 'note-dock-editor'
    : fullWidth
      ? 'knowledge-editor-empty knowledge-editor-full'
      : 'knowledge-editor-empty';

  if (!activeNoteId || !activeNote) {
    return (
      <div className={emptyClass}>
        <div className="knowledge-editor-empty-icon">
          <FileText size={28} />
        </div>
        <p className="text-sm font-medium">Заметки</p>
        <p className="text-xs text-[var(--text-secondary)] max-w-[220px] text-center leading-relaxed">
          Выберите заметку слева. Это обычный текст, не служебный файл.
        </p>
      </div>
    );
  }

  const save = (text: string) => {
    void saveActiveNote(restoreFrontmatter(activeNote.content, text));
  };

  return (
    <div className={paneClass}>
      <header className="knowledge-editor-header">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold truncate">{activeNote.title}</h2>
        </div>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={() => {
            if (editing) save(draft);
            setEditing((v) => !v);
          }}
        >
          {editing ? 'Готово' : 'Править'}
        </button>
      </header>
      <div className="knowledge-editor-body">
        {editing ? (
          <MarkdownEditor
            noteId={activeNoteId}
            content={draft}
            onChange={setDraft}
            onSave={save}
          />
        ) : (
          <div
            className="note-read h-full overflow-y-auto p-4"
            dangerouslySetInnerHTML={{ __html: renderNoteHtml(activeNote.content) }}
          />
        )}
      </div>
    </div>
  );
}
