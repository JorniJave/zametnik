import { useAppStore } from '../store/useAppStore';
import { KnowledgeNotesPanel } from './KnowledgeNotesPanel';
import { KnowledgeEditorPane } from './KnowledgeEditorPane';
import { MentionsPanel } from './MentionsPanel';

/** Отдельная вкладка «Заметки» — текстовый редактор, не база знаний */
export function NotesView() {
  const activeNoteId = useAppStore((s) => s.activeNoteId);
  const openNote = useAppStore((s) => s.openNote);

  return (
    <div className="notes-view flex flex-1 min-h-0">
      <KnowledgeNotesPanel
        selectedNoteId={activeNoteId}
        onSelect={(id) => void openNote(id)}
      />
      <KnowledgeEditorPane fullWidth />
      <MentionsPanel />
    </div>
  );
}
