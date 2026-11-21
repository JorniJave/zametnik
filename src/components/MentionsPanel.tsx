import { useAppStore } from '../store/useAppStore';

/** Список заметок, которые ссылаются на открытую. */
export function MentionsPanel() {
  const backlinks = useAppStore((s) => s.backlinks);
  const openNote = useAppStore((s) => s.openNote);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const notes = useAppStore((s) => s.notes);

  return (
    <aside className="mentions-pane">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
        Упоминается в
      </h2>
      {backlinks.length === 0 ? (
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Пока ни одна заметка не ссылается сюда через [[]].
        </p>
      ) : (
        <ul className="space-y-1">
          {backlinks.map((link) => (
            <li key={link.sourceId}>
              <button
                type="button"
                className="w-full text-left text-sm rounded-lg px-2 py-1.5 hover:bg-[var(--bg-secondary)]"
                onClick={() => {
                  const kind = notes[link.sourceId]?.type;
                  void openNote(link.sourceId);
                  setViewMode(kind === 'daily' ? 'today' : 'notes');
                }}
              >
                {link.sourceTitle}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
