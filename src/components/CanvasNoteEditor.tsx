import { useCallback, useEffect, useState } from 'react';
import { MarkdownEditor } from './MarkdownEditor';
import { useAppStore } from '../store/useAppStore';
import { getAPI } from '../lib/api';

interface CanvasNoteEditorProps {
  noteId: string;
  initialContent?: string;
}

/** Функция `CanvasNoteEditor`. */
export function CanvasNoteEditor({ noteId, initialContent }: CanvasNoteEditorProps) {
  const [content, setContent] = useState(initialContent ?? '');
  const [loaded, setLoaded] = useState(Boolean(initialContent));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const note = await getAPI().readNote(noteId);
      if (cancelled || !note) return;
      setContent(note.content);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [noteId]);

  const onSave = useCallback(
    async (text: string) => {
      const api = getAPI();
      const saved = await api.saveNote(noteId, text);
      useAppStore.getState().ingestSavedNote(saved);
    },
    [noteId]
  );

  if (!loaded) {
    return <div className="canvas-note-loading">Загрузка…</div>;
  }

  return (
    <MarkdownEditor
      noteId={noteId}
      content={content}
      onChange={setContent}
      onSave={onSave}
      compact
    />
  );
}
