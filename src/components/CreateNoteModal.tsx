import { useState } from 'react';
import { Modal } from './Modal';
import { useAppStore } from '../store/useAppStore';

interface CreateNoteModalProps {
  open: boolean;
  onClose: () => void;
}

/** Функция `CreateNoteModal`. */
export function CreateNoteModal({ open, onClose }: CreateNoteModalProps) {
  const createNote = useAppStore((s) => s.createNote);
  const [title, setTitle] = useState('');
  const [folder, setFolder] = useState('');

  /** Функция `submit`. */
  const submit = async () => {
    if (!title.trim()) return;
    await createNote(title.trim(), folder.trim() || undefined);
    setTitle('');
    setFolder('');
    onClose();
  };

  return (
    <Modal open={open} title="Новая заметка" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Название</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border bg-[var(--bg-secondary)] border-[var(--border)] text-sm"
            placeholder="Например: Проект Альфа"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Папка (необязательно)</label>
          <input
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border bg-[var(--bg-secondary)] border-[var(--border)] text-sm"
            placeholder="Проекты / Задачи"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" type="button" onClick={onClose}>
            Отмена
          </button>
          <button className="btn-primary" type="button" onClick={submit}>
            Создать
          </button>
        </div>
      </div>
    </Modal>
  );
}
