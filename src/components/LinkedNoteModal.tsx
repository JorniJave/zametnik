import { useState } from 'react';
import { Modal } from './Modal';
import type { EntityType } from '../types/workspace';

const ENTITY_OPTIONS: { id: EntityType; label: string }[] = [
  { id: 'note', label: 'Заметка' },
  { id: 'person', label: 'Человек' },
  { id: 'project', label: 'Проект' },
  { id: 'task', label: 'Задача' },
];

export interface LinkedNoteFormData {
  title: string;
  entityType: EntityType;
  body: string;
}

interface LinkedNoteModalProps {
  open: boolean;
  sourceTitle?: string;
  onClose: () => void;
  onSubmit: (data: LinkedNoteFormData) => Promise<void>;
}

/** Функция `LinkedNoteModal`. */
export function LinkedNoteModal({ open, sourceTitle, onClose, onSubmit }: LinkedNoteModalProps) {
  const [title, setTitle] = useState('');
  const [entityType, setEntityType] = useState<EntityType>('note');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  /** Функция `submit`. */
  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), entityType, body });
      setTitle('');
      setBody('');
      setEntityType('note');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={sourceTitle ? `Связанная заметка · ${sourceTitle}` : 'Новая связанная заметка'}
      onClose={onClose}
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Название</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input w-full"
            placeholder="Название узла"
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Тип</label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as EntityType)}
            className="input w-full"
          >
            {ENTITY_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Начальный текст (необязательно)</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="input w-full min-h-[80px] resize-y"
            placeholder="Дополнительный текст заметки"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="btn-primary" disabled={saving || !title.trim()} onClick={() => void submit()}>
            {saving ? 'Создание…' : 'Создать и связать'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
