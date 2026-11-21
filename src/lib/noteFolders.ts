import type { NoteMeta } from '../types';

const FOLDER_ORDER = ['Дни', 'Недели', 'Проекты', 'Задачи', 'Заметки'];

/** Папка в списке: тип дневника важнее сырого пути. */
export function noteFolderLabel(note: NoteMeta): string {
  if (note.type === 'daily') return 'Дни';
  if (note.type === 'week') return 'Недели';
  if (note.type === 'project') return 'Проекты';
  if (note.type === 'task') return 'Задачи';
  const parts = note.path.replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.length <= 1) return 'Заметки';
  const parent = parts[parts.length - 2];
  if (parent === '.zametnik' || parent.endsWith(':')) return 'Заметки';
  return parent;
}

/** Функция `groupNotesByFolder`. */
export function groupNotesByFolder(notes: NoteMeta[]): Map<string, NoteMeta[]> {
  const map = new Map<string, NoteMeta[]>();
  for (const note of notes) {
    const folder = noteFolderLabel(note);
    const list = map.get(folder) ?? [];
    list.push(note);
    map.set(folder, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => b.modified - a.modified);
  }
  return new Map(
    [...map.entries()].sort(([a], [b]) => {
      const ai = FOLDER_ORDER.indexOf(a);
      const bi = FOLDER_ORDER.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return a.localeCompare(b, 'ru');
    })
  );
}
