import { useEffect, useState } from 'react';

const listeners = new Map<string, Set<() => void>>();

/** Функция `storageKey`. */
function storageKey(id: string): string {
  return `zametnik-help-${id}`;
}

/** Функция `emit`. */
function emit(id: string): void {
  listeners.get(id)?.forEach((cb) => cb());
}

/** Функция `isViewHelpHidden`. */
export function isViewHelpHidden(id: string): boolean {
  return localStorage.getItem(storageKey(id)) === '1';
}

/** Функция `hideViewHelp`. */
export function hideViewHelp(id: string): void {
  localStorage.setItem(storageKey(id), '1');
  emit(id);
}

/** Функция `showViewHelp`. */
export function showViewHelp(id: string): void {
  localStorage.removeItem(storageKey(id));
  emit(id);
}

/** Функция `useViewHelpVisible`. */
export function useViewHelpVisible(id: string): boolean {
  const [visible, setVisible] = useState(() => !isViewHelpHidden(id));

  useEffect(() => {
    /** Функция `refresh`. */
    const refresh = () => setVisible(!isViewHelpHidden(id));
    if (!listeners.has(id)) listeners.set(id, new Set());
    listeners.get(id)!.add(refresh);
    return () => {
      listeners.get(id)?.delete(refresh);
    };
  }, [id]);

  return visible;
}
